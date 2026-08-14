// src/lib/api-auth.ts
import 'server-only';
import { verifySession, type SessionInfo } from '@/lib/session';
import { UserRole } from '@/lib/prisma';
import { ForbiddenError } from '@/lib/errors';

/**
 * RBAC guards for API routes / server actions. Throws UnauthorizedError with
 * no session, ForbiddenError on an insufficient role. Pair with
 * `handleApiError` in the route's catch block.
 *
 * Policy:
 * - SUPER_ADMIN: everything, incl. user management and role changes.
 * - ADMIN: rooms, pricing, bookings, reviews, payments.
 * - FRONT_DESK: bookings, check-ins/outs, guest lookups; read elsewhere.
 */
export async function requireRole(
  ...roles: UserRole[]
): Promise<SessionInfo> {
  const session = await verifySession();
  if (!roles.includes(session.role)) throw new ForbiddenError();
  return session;
}

/** Any authenticated staff account. */
export const requireUser = () => verifySession();

/** ADMIN or SUPER_ADMIN. */
export const requireAdmin = () =>
  requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);

/** SUPER_ADMIN only (user management, role changes). */
export const requireSuperAdmin = () => requireRole(UserRole.SUPER_ADMIN);

/** Booking operations: every role incl. FRONT_DESK. */
export const requireStaff = () =>
  requireRole(UserRole.FRONT_DESK, UserRole.ADMIN, UserRole.SUPER_ADMIN);
