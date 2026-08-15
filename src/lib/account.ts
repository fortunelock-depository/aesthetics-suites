// src/lib/account.ts
//
// Self-service account actions for signed-in staff (the khadys/dms
// pattern): profile edit, and a password change that bumps the session
// epoch - signing the account out of every OTHER device - then re-issues
// the current device's cookie so it stays signed in.
'use server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { ENV } from '@/config/env';
import { createSession, verifySession } from '@/lib/session';
import {
  EMAIL_CHANGE_TTL_MINUTES,
  consumeOpaqueToken,
  generateResetToken,
  issueUserSecurityToken,
  revokeAllUserSecurityTokens,
} from '@/utils/user-security-tokens';
import {
  sendEmailChangeConfirmEmail,
  sendPasswordChangedEmail,
} from '@/lib/mail/auth-emails';
import { BCRYPT_SALT_ROUNDS } from '@/config/constants';
import { changePasswordSchema } from '@/validations/auth-validation';
import { profileUpdateSchema } from '@/validations/user-validation';
import { ratelimit } from '@/lib/rate-limit';

/**
 * Per-user throttle on actions that verify the account password. Without
 * it, a stolen session cookie gets an unlimited online oracle to
 * brute-force the current password (and from there, full takeover via
 * email/password change).
 */
async function passwordVerifyAllowed(userId: string): Promise<boolean> {
  const { success } = await ratelimit.limit(`pwverify:${userId}`);
  return success;
}

export type ProfileState = {
  success: boolean;
  message?: string;
  /** True when the submit started a pending email change (link emailed). */
  emailChangeRequested?: boolean;
  errors?: {
    fullname?: string[];
    phone?: string[];
    email?: string[];
    currentPassword?: string[];
    _form?: string[];
  };
};

export async function updateProfile(
  _state: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { userId } = await verifySession();

  const phoneRaw = formData.get('phone');
  const emailRaw = formData.get('email');
  const passwordRaw = formData.get('currentPassword');
  const parsed = profileUpdateSchema.safeParse({
    fullname: formData.get('fullname'),
    // An emptied field clears the saved number.
    phone: typeof phoneRaw === 'string' && phoneRaw.trim() === '' ? null : phoneRaw,
    email: typeof emailRaw === 'string' && emailRaw.trim() !== '' ? emailRaw : undefined,
    currentPassword:
      typeof passwordRaw === 'string' && passwordRaw !== ''
        ? passwordRaw
        : undefined,
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, email: true, fullname: true, password: true },
  });
  if (!user) return { success: false, errors: { _form: ['Account not found.'] } };

  const newEmail = parsed.data.email?.toLowerCase().trim();
  const changingEmail = !!newEmail && newEmail !== user.email;

  // The dms guarded email flow: the current password re-authorizes the
  // change, then a confirmation link goes to the CURRENT address. Nothing
  // switches until that link is clicked.
  if (changingEmail) {
    if (!parsed.data.currentPassword) {
      return {
        success: false,
        errors: {
          currentPassword: [
            'Enter your password to change your email address',
          ],
        },
      };
    }
    if (!(await passwordVerifyAllowed(userId))) {
      return {
        success: false,
        errors: { _form: ['Too many attempts. Try again shortly.'] },
      };
    }
    if (!(await bcrypt.compare(parsed.data.currentPassword, user.password))) {
      return {
        success: false,
        errors: { currentPassword: ['Current password is incorrect'] },
      };
    }
    const taken = await prisma.user.findFirst({
      where: { email: newEmail, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) {
      return {
        success: false,
        errors: { email: ['An account with that email already exists'] },
      };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      fullname: parsed.data.fullname,
      phone: parsed.data.phone ?? null,
      ...(changingEmail ? { pendingEmail: newEmail } : {}),
    },
  });

  if (changingEmail && newEmail) {
    const token = generateResetToken();
    await issueUserSecurityToken(
      userId,
      'EMAIL_CHANGE',
      token,
      EMAIL_CHANGE_TTL_MINUTES,
    );
    await sendEmailChangeConfirmEmail(
      user,
      `${ENV.BASE_URL}/confirm-email?token=${token}`,
      newEmail,
    );
    return {
      success: true,
      emailChangeRequested: true,
      message:
        'Profile updated. Check your current inbox to confirm the email change - your address stays the same until you click the link.',
    };
  }

  return { success: true, message: 'Profile updated.' };
}

export type ConfirmEmailChangeResult = {
  success: boolean;
  message: string;
};

/**
 * useActionState wrapper for the confirm-email page's explicit-click form.
 * The token is consumed HERE (a POST), never on the page's GET render.
 */
export async function confirmEmailChangeAction(
  _state: ConfirmEmailChangeResult | null,
  formData: FormData,
): Promise<ConfirmEmailChangeResult> {
  const token = String(formData.get('token') ?? '');
  if (!token) {
    return {
      success: false,
      message: 'This confirmation link is missing its token.',
    };
  }
  return confirmEmailChange(token);
}

/**
 * Applies a pending login-email change. Public - the token from the email
 * sent to the previous address IS the credential. Bumps the session epoch,
 * so every device must sign in again with the new email.
 */
async function confirmEmailChange(
  token: string,
): Promise<ConfirmEmailChangeResult> {
  const invalid = {
    success: false,
    message:
      'This confirmation link is invalid or has expired. Please request the email change again from your profile.',
  };

  const userId = await consumeOpaqueToken(token, 'EMAIL_CHANGE');
  if (!userId) return invalid;

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, pendingEmail: true },
  });
  if (!user) return invalid;
  if (!user.pendingEmail) {
    return {
      success: false,
      message: 'There is no pending email change for this account.',
    };
  }

  // Someone may have registered the address between request and confirm.
  const taken = await prisma.user.findFirst({
    where: { email: user.pendingEmail, NOT: { id: userId } },
    select: { id: true },
  });
  if (taken) {
    await prisma.user.update({
      where: { id: userId },
      data: { pendingEmail: null },
    });
    return {
      success: false,
      message: 'An account with that email already exists.',
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      email: user.pendingEmail,
      pendingEmail: null,
      // Epoch bump: every session dies; sign in again with the new email.
      sessionVersion: { increment: 1 },
    },
  });

  return {
    success: true,
    message:
      'Your sign-in email has been updated. Please sign in again with the new address.',
  };
}

export type ProfilePhotoState = {
  success: boolean;
  message?: string;
  error?: string;
};

/**
 * Replaces the profile photo. The client downscales before staging
 * (optimize-image), the server enforces size/type limits, and the OLD
 * Cloudinary asset is reclaimed only after the new one is saved.
 */
export async function updateProfilePhoto(
  formData: FormData,
): Promise<ProfilePhotoState> {
  const { userId } = await verifySession();

  try {
    const { fileToUploaded } = await import('@/lib/uploads');
    const { uploadImage, deleteImage } = await import('@/lib/cloudinary');

    const file = await fileToUploaded(formData.get('photo'), 'profile photo');
    if (!file) return { success: false, error: 'Select an image first.' };

    const previous = await prisma.user.findFirst({
      where: { id: userId },
      select: { profilePhoto: true, profilePhotoId: true },
    });

    const uploaded = await uploadImage(file);
    await prisma.user.update({
      where: { id: userId },
      data: {
        profilePhoto: uploaded.secure_url,
        profilePhotoId: uploaded.public_id,
      },
    });

    // Best-effort cleanup - deleteImage logs and swallows failures.
    if (previous?.profilePhotoId ?? previous?.profilePhoto) {
      await deleteImage(previous.profilePhotoId ?? previous.profilePhoto!);
    }

    return { success: true, message: 'Profile photo updated.' };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Could not update the photo.',
    };
  }
}

/** Removes the stored photo and reclaims the Cloudinary asset. */
export async function removeProfilePhoto(): Promise<ProfilePhotoState> {
  const { userId } = await verifySession();

  try {
    const { deleteImage } = await import('@/lib/cloudinary');

    const previous = await prisma.user.findFirst({
      where: { id: userId },
      select: { profilePhoto: true, profilePhotoId: true },
    });
    if (!previous?.profilePhoto && !previous?.profilePhotoId) {
      return { success: false, error: 'No photo to remove.' };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: null, profilePhotoId: null },
    });
    await deleteImage(previous.profilePhotoId ?? previous.profilePhoto!);

    return { success: true, message: 'Profile photo removed.' };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Could not remove the photo.',
    };
  }
}

export type ChangePasswordState = {
  success: boolean;
  /** Changes on every success - the form remounts on it to clear fields. */
  changedAt?: number;
  message?: string;
  errors?: {
    currentPassword?: string[];
    newPassword?: string[];
    confirmPassword?: string[];
    _form?: string[];
  };
};

export async function changePassword(
  _state: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const { userId, role } = await verifySession();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, email: true, fullname: true, password: true },
  });
  if (!user) return { success: false, errors: { _form: ['Account not found.'] } };

  if (!(await passwordVerifyAllowed(userId))) {
    return {
      success: false,
      errors: { _form: ['Too many attempts. Try again shortly.'] },
    };
  }

  if (!(await bcrypt.compare(parsed.data.currentPassword, user.password))) {
    return {
      success: false,
      errors: { currentPassword: ['Current password is incorrect'] },
    };
  }

  const hashedPassword = await bcrypt.hash(
    parsed.data.newPassword,
    BCRYPT_SALT_ROUNDS,
  );

  // Epoch bump invalidates every outstanding session JWT...
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword, sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });

  // ...then the CURRENT device gets a fresh cookie with the new epoch, so
  // only the other devices are signed out.
  await createSession(userId, role, updated.sessionVersion);

  await revokeAllUserSecurityTokens(userId);
  await sendPasswordChangedEmail(user);

  return {
    success: true,
    changedAt: Date.now(),
    message: 'Password changed. All other devices have been signed out.',
  };
}
