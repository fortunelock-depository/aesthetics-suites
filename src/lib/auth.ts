// src/lib/auth.ts
'use server';
import { headers } from 'next/headers';
import bcrypt from 'bcrypt';
import prisma, { UserSecurityTokenType } from '@/lib/prisma';
import { createSession, deleteSession, verifySession } from '@/lib/session';
import {
  setTwoFactorPending,
  getTwoFactorPendingUserId,
  clearTwoFactorPending,
} from '@/lib/two-factor-session';
import {
  generateOtpCode,
  generateResetToken,
  issueUserSecurityToken,
  verifyUserOtp,
  otpFailureMessage,
  consumePasswordResetToken,
  revokeAllUserSecurityTokens,
  TWO_FACTOR_CODE_TTL_MINUTES,
  PASSWORD_RESET_TTL_MINUTES,
} from '@/utils/user-security-tokens';
import {
  sendTwoFactorCodeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendTwoFactorDisabledEmail,
} from '@/lib/mail/auth-emails';
import { ENV } from '@/config/env';
import { BCRYPT_SALT_ROUNDS } from '@/config/constants';
import {
  signinSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/validations/auth-validation';
import type { IUser } from '@/types/user.types';
import { ratelimit } from '@/lib/rate-limit';
import { clientIp } from '@/utils/client-ip';

type FormErrors = { email?: string[]; password?: string[]; _form?: string[] };

export type SigninState = {
  success: boolean;
  redirectTo?: string;
  user?: IUser;
  errors?: FormErrors;
  requiresTwoFactor?: boolean;
  maskedEmail?: string;
};

export type TwoFactorState = {
  success: boolean;
  redirectTo?: string;
  user?: IUser;
  error?: string;
  resent?: boolean;
};

export type ForgotPasswordState = {
  success: boolean;
  message?: string;
  error?: string;
};

export type ResetPasswordState = {
  success: boolean;
  redirectTo?: string;
  message?: string;
  errors?: { token?: string[]; password?: string[]; _form?: string[] };
};

export type TwoFactorSetupState = {
  success: boolean;
  pending?: boolean;
  enabled?: boolean;
  message?: string;
  error?: string;
};

const userSelect = {
  id: true,
  email: true,
  fullname: true,
  phone: true,
  role: true,
  twoFactorEnabled: true,
  profilePhoto: true,
  sessionVersion: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Sacrificial compare target for unknown emails: without it, the missing
 * ~250ms bcrypt compare makes "account exists" readable from login timing.
 */
const DUMMY_PASSWORD_HASH =
  '$2b$12$oVzYbVerXrczeL2LeVm4s.wVyuwA/Gqb0ibqE1mnr.J0npZqZY1vO';

function limitOutcome(results: { success: boolean; reset: number }[]): {
  allowed: boolean;
  retrySecs: number;
} {
  const blocked = results.find((result) => !result.success);
  return {
    allowed: !blocked,
    retrySecs: blocked
      ? Math.max(Math.ceil((blocked.reset - Date.now()) / 1000), 1)
      : 0,
  };
}

/**
 * Per-flow, per-IP throttle for the auth actions. The prefix gives each
 * flow its own bucket, so login attempts cannot eat the forgot-password
 * budget.
 */
async function checkRateLimit(
  prefix: string,
): Promise<{ allowed: boolean; retrySecs: number }> {
  const ip = clientIp(await headers());
  return limitOutcome([await ratelimit.limit(`${prefix}:${ip}`)]);
}

/**
 * Account-scoped throttle, keyed on the identifier alone: N rotating IPs
 * still share one budget of guesses against a single account. Deliberately
 * does NOT also consume an IP bucket - the caller's per-IP check already
 * did that, and double-counting halves the honest user's allowance.
 */
async function checkAccountRateLimit(
  prefix: string,
  key: string,
): Promise<{ allowed: boolean; retrySecs: number }> {
  return limitOutcome([await ratelimit.limit(`${prefix}:${key}`)]);
}

/** Masks an email for display on the 2FA step, e.g. "ab***@gmail.com". */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

/**
 * Only same-origin paths are honoured as a post-login destination, so a
 * crafted `?callbackUrl=https://evil.example` can never turn the login form
 * into an open redirect.
 */
function safeRedirect(raw: FormDataEntryValue | null): string {
  const value = typeof raw === 'string' ? raw : '';
  return value.startsWith('/') && !value.startsWith('//') ? value : '/admin';
}

export async function signin(
  _state: SigninState,
  formData: FormData,
): Promise<SigninState> {
  const { allowed, retrySecs } = await checkRateLimit('auth-login');
  if (!allowed) {
    return {
      success: false,
      errors: {
        _form: [`Too many login attempts. Try again in ${retrySecs}s.`],
      },
    };
  }

  const parsed = signinSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Account-scoped bucket: N rotating IPs still get one shared budget of
  // guesses against a single staff account.
  const perAccount = await checkAccountRateLimit(
    'auth-login-acct',
    normalizedEmail,
  );
  if (!perAccount.allowed) {
    return {
      success: false,
      errors: {
        _form: [
          `Too many login attempts. Try again in ${perAccount.retrySecs}s.`,
        ],
      },
    };
  }

  // findFirst (not findUnique) so soft-deleted users are excluded by the extension.
  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail },
  });

  // Unknown email still pays the bcrypt cost (see DUMMY_PASSWORD_HASH).
  const passwordOk = user
    ? await bcrypt.compare(password, user.password)
    : (await bcrypt.compare(password, DUMMY_PASSWORD_HASH), false);
  if (!user || !passwordOk) {
    return { success: false, errors: { _form: ['Invalid email or password'] } };
  }

  // 2FA-enabled accounts get a code challenge instead of a session.
  if (user.twoFactorEnabled) {
    const code = generateOtpCode();
    await issueUserSecurityToken(
      user.id,
      UserSecurityTokenType.TWO_FACTOR_LOGIN,
      code,
      TWO_FACTOR_CODE_TTL_MINUTES,
    );
    const sent = await sendTwoFactorCodeEmail(user, code, 'login');
    if (!sent) {
      return {
        success: false,
        errors: {
          _form: [
            'We could not send your sign-in code right now. Please try again.',
          ],
        },
      };
    }
    await setTwoFactorPending(user.id);
    return {
      success: false,
      requiresTwoFactor: true,
      maskedEmail: maskEmail(user.email),
    };
  }

  await createSession(user.id, user.role, user.sessionVersion);
  const { password: _pw, deletedAt: _del, sessionVersion: _sv2, ...safeUser } = user;
  void _pw;
  void _del;
  void _sv2;
  return {
    success: true,
    redirectTo: safeRedirect(formData.get('callbackUrl')),
    user: safeUser,
  };
}

export async function verifyTwoFactorLogin(
  _state: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const { allowed, retrySecs } = await checkRateLimit('auth-2fa');
  if (!allowed) {
    return {
      success: false,
      error: `Too many attempts. Try again in ${retrySecs}s.`,
    };
  }

  const userId = await getTwoFactorPendingUserId();
  if (!userId) {
    return {
      success: false,
      error: 'Your login session expired. Please sign in again.',
    };
  }

  const code = String(formData.get('code') ?? '').trim();
  if (!/^\d{6}$/.test(code)) {
    return { success: false, error: 'Enter the 6-digit code from your email' };
  }

  const result = await verifyUserOtp(
    userId,
    UserSecurityTokenType.TWO_FACTOR_LOGIN,
    code,
  );
  if (!result.ok) {
    return {
      success: false,
      error: otpFailureMessage(result.reason, result.attemptsLeft),
    };
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: userSelect,
  });
  if (!user) {
    return {
      success: false,
      error: 'Your login session expired. Please sign in again.',
    };
  }

  await clearTwoFactorPending();
  await createSession(user.id, user.role, user.sessionVersion);
  const { sessionVersion: _sv, ...safeUser } = user;
  void _sv;
  return { success: true, redirectTo: '/admin', user: safeUser };
}

export async function resendTwoFactorCode(): Promise<TwoFactorState> {
  const { allowed, retrySecs } = await checkRateLimit('auth-2fa-resend');
  if (!allowed) {
    return {
      success: false,
      error: `Too many requests. Try again in ${retrySecs}s.`,
    };
  }

  const userId = await getTwoFactorPendingUserId();
  if (!userId) {
    return {
      success: false,
      error: 'Your login session expired. Please sign in again.',
    };
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, fullname: true, email: true },
  });
  if (!user) {
    return {
      success: false,
      error: 'Your login session expired. Please sign in again.',
    };
  }

  const code = generateOtpCode();
  await issueUserSecurityToken(
    user.id,
    UserSecurityTokenType.TWO_FACTOR_LOGIN,
    code,
    TWO_FACTOR_CODE_TTL_MINUTES,
  );
  const sent = await sendTwoFactorCodeEmail(user, code, 'login');
  if (!sent) {
    return {
      success: false,
      error: 'We could not send the code right now. Please try again.',
    };
  }
  return { success: false, resent: true };
}

/** Starts a password reset. Always answers generically (anti-enumeration). */
export async function forgotPassword(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const { allowed, retrySecs } = await checkRateLimit('auth-forgot');
  if (!allowed) {
    return {
      success: false,
      error: `Too many requests. Try again in ${retrySecs}s.`,
    };
  }

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get('email'),
  });
  if (!parsed.success) {
    return { success: false, error: 'Enter a valid email address.' };
  }

  const genericMessage =
    'If an account exists for that email, a reset link has been sent.';

  const user = await prisma.user.findFirst({
    where: { email: parsed.data.email.toLowerCase().trim() },
    select: { id: true, fullname: true, email: true },
  });

  if (user) {
    const token = generateResetToken();
    await issueUserSecurityToken(
      user.id,
      UserSecurityTokenType.PASSWORD_RESET,
      token,
      PASSWORD_RESET_TTL_MINUTES,
    );
    // Fire-and-forget: awaiting SMTP here makes response time an existence
    // oracle (only real accounts pay the send latency). Failures surface
    // through the mail layer's own logging.
    void sendPasswordResetEmail(
      user,
      `${ENV.BASE_URL}/reset-password?token=${token}`,
    );
  }

  return { success: true, message: genericMessage };
}

/** Completes a reset: consumes the emailed token and sets the new password. */
export async function resetPassword(
  _state: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const { allowed, retrySecs } = await checkRateLimit('auth-reset');
  if (!allowed) {
    return {
      success: false,
      errors: { _form: [`Too many attempts. Try again in ${retrySecs}s.`] },
    };
  }

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { token, password } = parsed.data;

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return {
      success: false,
      errors: {
        _form: ['This reset link is invalid or has expired. Request a new one.'],
      },
    };
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  // Epoch bump: a reset signs the account out of EVERY device.
  const user = await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword, sessionVersion: { increment: 1 } },
    select: { id: true, fullname: true, email: true },
  });

  await revokeAllUserSecurityTokens(userId);
  await sendPasswordChangedEmail(user);

  return {
    success: true,
    redirectTo: '/login',
    message: 'Your password has been reset. You can now sign in.',
  };
}

/** Step 1 of enabling 2FA: email a setup code to the signed-in user. */
export async function requestTwoFactorSetup(): Promise<TwoFactorSetupState> {
  const { userId } = await verifySession();

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, fullname: true, email: true, twoFactorEnabled: true },
  });
  if (!user) return { success: false, error: 'Account not found.' };
  if (user.twoFactorEnabled) {
    return {
      success: false,
      error: 'Two-factor authentication is already enabled.',
    };
  }

  const code = generateOtpCode();
  await issueUserSecurityToken(
    user.id,
    UserSecurityTokenType.TWO_FACTOR_SETUP,
    code,
    TWO_FACTOR_CODE_TTL_MINUTES,
  );
  const sent = await sendTwoFactorCodeEmail(user, code, 'setup');
  if (!sent) {
    return {
      success: false,
      error: 'We could not send the code right now. Please try again.',
    };
  }
  return {
    success: true,
    pending: true,
    message: 'We sent a code to your email.',
  };
}

/** Step 2 of enabling 2FA: verify the setup code and flip the flag on. */
export async function confirmTwoFactorSetup(
  _state: TwoFactorSetupState,
  formData: FormData,
): Promise<TwoFactorSetupState> {
  const { userId } = await verifySession();

  const code = String(formData.get('code') ?? '').trim();
  if (!/^\d{6}$/.test(code)) {
    return {
      success: false,
      pending: true,
      error: 'Enter the 6-digit code from your email',
    };
  }

  const result = await verifyUserOtp(
    userId,
    UserSecurityTokenType.TWO_FACTOR_SETUP,
    code,
  );
  if (!result.ok) {
    return {
      success: false,
      pending: true,
      error: otpFailureMessage(result.reason, result.attemptsLeft),
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });
  return {
    success: true,
    enabled: true,
    message: 'Two-factor authentication is now enabled.',
  };
}

/**
 * Disables 2FA for the signed-in user. Requires the current password: a
 * hijacked session alone must not be able to strip the second factor
 * (enabling demands an emailed code, so disabling cannot be cheaper).
 */
export async function disableTwoFactor(
  _state: TwoFactorSetupState,
  formData: FormData,
): Promise<TwoFactorSetupState> {
  const { allowed, retrySecs } = await checkRateLimit('auth-2fa-disable');
  if (!allowed) {
    return {
      success: false,
      error: `Too many attempts. Try again in ${retrySecs}s.`,
    };
  }

  const { userId } = await verifySession();
  const account = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, fullname: true, email: true, password: true },
  });
  if (!account) return { success: false, error: 'Account not found.' };

  const password = String(formData.get('password') ?? '');
  if (!password || !(await bcrypt.compare(password, account.password))) {
    return { success: false, error: 'Your current password is incorrect.' };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false },
  });
  await prisma.userSecurityToken.deleteMany({
    where: {
      userId,
      type: {
        in: [
          UserSecurityTokenType.TWO_FACTOR_LOGIN,
          UserSecurityTokenType.TWO_FACTOR_SETUP,
        ],
      },
    },
  });
  // Notify the owner - if this was not them, they must find out now.
  void sendTwoFactorDisabledEmail(account);
  return {
    success: true,
    enabled: false,
    message: 'Two-factor authentication disabled.',
  };
}

export async function logout(): Promise<void> {
  await deleteSession();
}
