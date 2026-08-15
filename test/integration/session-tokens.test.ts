// Session token integrity.
//
// Regression cover for a real 2FA bypass: the pending-2FA cookie and the
// session cookie were signed with the same secret, and `decrypt` accepted
// any validly-signed token without checking what it was for. Because the
// pending token carries no session epoch, the epoch check fell back to 0 -
// which matches every account that has never changed its password, the
// seeded admin included. An attacker holding a password could submit the
// login form, rename the `two_factor_pending` cookie it returned to
// `session`, and be fully signed in without ever seeing the emailed code.
//
// These tests exercise the real signing and verification, not a mock.
import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { ENV } from '@/config/env';
import { decrypt, encrypt } from '@/lib/session';
import { UserRole } from '@/lib/prisma';

/** Mints a token the way the pre-fix pending-2FA cookie was minted. */
async function legacyPendingToken(userId: string): Promise<string> {
  return new SignJWT({ userId, purpose: 'two_factor_pending' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(new TextEncoder().encode(ENV.SESSION_SECRET));
}

describe('session token integrity', () => {
  it('round-trips a genuine session', async () => {
    const token = await encrypt({
      userId: 'user-1',
      role: UserRole.ADMIN,
      sv: 3,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const payload = await decrypt(token);
    expect(payload?.userId).toBe('user-1');
    expect(payload?.sv).toBe(3);
  });

  it('rejects a pending-2FA token presented as a session', async () => {
    const token = await legacyPendingToken('user-1');
    // Signed with the raw secret and carrying no epoch: the exact shape that
    // used to authenticate. Both the separate signing key and the purpose
    // claim have to fail open for this to come back non-null.
    expect(await decrypt(token)).toBeNull();
  });

  it('rejects a token signed with the raw secret even in session shape', async () => {
    const token = await new SignJWT({
      userId: 'user-1',
      role: UserRole.SUPER_ADMIN,
      sv: 0,
      purpose: 'session',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(ENV.SESSION_SECRET));

    // Key separation alone must stop this, independent of any claim check.
    expect(await decrypt(token)).toBeNull();
  });

  it('rejects a session-key token that omits the purpose claim', async () => {
    const token = await new SignJWT({
      userId: 'user-1',
      role: UserRole.ADMIN,
      sv: 1,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(`${ENV.SESSION_SECRET}::session`));

    // The claim check must stand on its own, independent of key separation.
    expect(await decrypt(token)).toBeNull();
  });

  it('rejects tampered and expired tokens', async () => {
    const token = await encrypt({
      userId: 'user-1',
      role: UserRole.ADMIN,
      sv: 1,
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(await decrypt(`${token}x`)).toBeNull();
    expect(await decrypt(undefined)).toBeNull();

    const expired = await new SignJWT({
      userId: 'user-1',
      role: UserRole.ADMIN,
      sv: 1,
      purpose: 'session',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(new TextEncoder().encode(`${ENV.SESSION_SECRET}::session`));
    expect(await decrypt(expired)).toBeNull();
  });
});
