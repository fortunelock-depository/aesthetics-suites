// src/utils/user-security-tokens.ts
import 'server-only';
import crypto from 'crypto';
import prisma, { UserSecurityTokenType } from '@/lib/prisma';

export const TWO_FACTOR_CODE_TTL_MINUTES = 10;
export const PASSWORD_RESET_TTL_MINUTES = 30;
export const EMAIL_CHANGE_TTL_MINUTES = 60 * 24;

/** 6-digit one-time code for email OTP challenges. */
export const generateOtpCode = (): string =>
  crypto.randomInt(100000, 1000000).toString();

/** Long opaque token for password-reset links. */
export const generateResetToken = (): string =>
  crypto.randomBytes(32).toString('hex');

export const hashSecurityToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * Issues a new security token, invalidating any outstanding unconsumed tokens
 * of the same type first (one live token per type). Only the sha256 hash is
 * persisted - the plain value never touches the database.
 */
export const issueUserSecurityToken = async (
  userId: string,
  type: UserSecurityTokenType,
  plainToken: string,
  ttlMinutes: number,
): Promise<void> => {
  await prisma.userSecurityToken.deleteMany({
    where: { userId, type, consumedAt: null },
  });

  await prisma.userSecurityToken.create({
    data: {
      userId,
      type,
      tokenHash: hashSecurityToken(plainToken),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    },
  });
};

export type OtpVerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'not_found' | 'expired' | 'too_many_attempts' | 'invalid';
      attemptsLeft?: number;
    };

/**
 * Verifies a user-scoped OTP. Wrong codes count against `maxAttempts`; a
 * correct code is consumed atomically so it can never be replayed.
 */
export const verifyUserOtp = async (
  userId: string,
  type: UserSecurityTokenType,
  code: string,
): Promise<OtpVerifyResult> => {
  const record = await prisma.userSecurityToken.findFirst({
    where: { userId, type, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) return { ok: false, reason: 'not_found' };
  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }
  if (record.attempts >= record.maxAttempts) {
    return { ok: false, reason: 'too_many_attempts' };
  }

  if (record.tokenHash !== hashSecurityToken(code)) {
    const updated = await prisma.userSecurityToken.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true, maxAttempts: true },
    });
    return {
      ok: false,
      reason:
        updated.attempts >= updated.maxAttempts
          ? 'too_many_attempts'
          : 'invalid',
      attemptsLeft: Math.max(updated.maxAttempts - updated.attempts, 0),
    };
  }

  // Atomic consume: the guarded updateMany means a token can only ever be
  // redeemed once, even under concurrent requests.
  const consumed = await prisma.userSecurityToken.updateMany({
    where: { id: record.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count === 0) return { ok: false, reason: 'not_found' };

  return { ok: true };
};

/**
 * Consumes a link-style opaque token (looked up by hash). Returns the
 * owning userId, or null when the token is unknown, expired, wrong-type,
 * or already used. The guarded updateMany makes redemption single-use
 * even under concurrent requests.
 */
export const consumeOpaqueToken = async (
  plainToken: string,
  type: UserSecurityTokenType,
): Promise<string | null> => {
  const record = await prisma.userSecurityToken.findUnique({
    where: { tokenHash: hashSecurityToken(plainToken) },
  });

  if (
    !record ||
    record.type !== type ||
    record.consumedAt !== null ||
    record.expiresAt.getTime() < Date.now()
  ) {
    return null;
  }

  const consumed = await prisma.userSecurityToken.updateMany({
    where: { id: record.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count === 0) return null;

  return record.userId;
};

/** Consumes a password-reset token; see consumeOpaqueToken. */
export const consumePasswordResetToken = (
  plainToken: string,
): Promise<string | null> =>
  consumeOpaqueToken(plainToken, UserSecurityTokenType.PASSWORD_RESET);

/** Removes every outstanding token for a user (e.g. after a password reset). */
export const revokeAllUserSecurityTokens = async (
  userId: string,
): Promise<void> => {
  await prisma.userSecurityToken.deleteMany({
    where: { userId, consumedAt: null },
  });
};

export const otpFailureMessage = (
  reason: 'not_found' | 'expired' | 'too_many_attempts' | 'invalid',
  attemptsLeft?: number,
): string => {
  switch (reason) {
    case 'expired':
      return 'This code has expired. Request a new one.';
    case 'too_many_attempts':
      return 'Too many incorrect attempts. Request a new code.';
    case 'not_found':
      return 'No active code found. Request a new one.';
    default:
      return attemptsLeft !== undefined
        ? `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`
        : 'Incorrect code.';
  }
};
