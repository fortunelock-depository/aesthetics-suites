// src/lib/session.ts
import 'server-only';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ENV } from '@/config/env';
import type { UserRole } from '@/lib/prisma';
import { UnauthorizedError } from '@/lib/errors';

// NOTE: prisma is imported LAZILY inside the verify helpers, never at the
// top level - proxy.ts pulls `decrypt` from this module and must not drag
// the database driver into the middleware bundle.

const encodedKey = new TextEncoder().encode(ENV.SESSION_SECRET);

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_DURATION = '7d';

export interface SessionPayload extends JWTPayload {
  userId: string;
  role: UserRole;
  /** Session epoch - must match User.sessionVersion (see schema). */
  sv: number;
  expiresAt: Date;
}

export interface SessionInfo {
  isAuth: true;
  userId: string;
  role: UserRole;
  /** ADMIN or SUPER_ADMIN. */
  isAdmin: boolean;
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(encodedKey);
}

export async function decrypt(
  session: string | undefined,
): Promise<SessionPayload | null> {
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as SessionPayload;
  } catch {
    // An invalid/expired token is an expected state (stale cookie), not an
    // error worth logging - the caller treats null as "not signed in".
    return null;
  }
}

export async function createSession(
  userId: string,
  role: UserRole,
  sessionVersion: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await encrypt({
    userId,
    role,
    sv: sessionVersion,
    expiresAt,
  });
  const cookieStore = await cookies();

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: ENV.IS_PRODUCTION,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

/**
 * The authoritative check: decrypts the cookie AND confirms the session
 * epoch (and current role) against the database, so a password change or
 * role change takes effect on every device immediately. One indexed
 * primary-key lookup, cached per request.
 */
const resolveSession = cache(async (): Promise<SessionInfo | null> => {
  const cookie = (await cookies()).get('session')?.value;
  const session = await decrypt(cookie);
  if (!session?.userId) return null;

  const { default: prisma, UserRole } = await import('@/lib/prisma');
  const user = await prisma.user.findFirst({
    where: { id: session.userId },
    select: { sessionVersion: true, role: true },
  });
  // Deleted user or a stale epoch (logged out everywhere) -> not signed in.
  if (!user || user.sessionVersion !== (session.sv ?? 0)) return null;

  return {
    isAuth: true,
    userId: session.userId,
    // Live role from the DB, so demotions apply without re-login.
    role: user.role,
    isAdmin:
      user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN,
  };
});

// Throws UnauthorizedError - use in API route handlers / server actions.
export const verifySession = async (): Promise<SessionInfo> => {
  const session = await resolveSession();
  if (!session) throw new UnauthorizedError();
  return session;
};

// Redirects - use in Server Components and protected layouts.
export const requireSession = async (): Promise<SessionInfo> => {
  const session = await resolveSession();
  if (!session) redirect('/login');
  return session;
};
