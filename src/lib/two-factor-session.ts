// src/lib/two-factor-session.ts
import 'server-only';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { ENV } from '@/config/env';

const encodedKey = new TextEncoder().encode(ENV.SESSION_SECRET);

const PENDING_COOKIE = 'two_factor_pending';
const PENDING_PURPOSE = 'two_factor_pending';
// Matches the OTP lifetime (TWO_FACTOR_CODE_TTL_MINUTES).
const PENDING_TTL_SECONDS = 10 * 60;

interface PendingPayload extends JWTPayload {
  userId: string;
  purpose: string;
}

/**
 * Sets the short-lived cookie that proves the password step succeeded and a
 * 2FA challenge is awaiting its code. It only ever exists between login and
 * code verification.
 */
export const setTwoFactorPending = async (userId: string): Promise<void> => {
  const token = await new SignJWT({ userId, purpose: PENDING_PURPOSE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_TTL_SECONDS}s`)
    .sign(encodedKey);

  const cookieStore = await cookies();
  cookieStore.set(PENDING_COOKIE, token, {
    httpOnly: true,
    secure: ENV.IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
    maxAge: PENDING_TTL_SECONDS,
  });
};

/**
 * Resolves the user id behind the pending-2FA cookie, or null when it is
 * missing, expired, tampered with, or of the wrong purpose.
 */
export const getTwoFactorPendingUserId = async (): Promise<string | null> => {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    });
    const { userId, purpose } = payload as PendingPayload;
    if (purpose !== PENDING_PURPOSE || !userId) return null;
    return userId;
  } catch {
    return null;
  }
};

export const clearTwoFactorPending = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_COOKIE);
};
