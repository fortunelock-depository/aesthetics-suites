// src/app/api/users/[id]/2fa/disable/route.ts
//
// Admin 2FA rescue (chosen-fintech pattern): when a user with 2FA loses
// access to their email, a super admin can switch it off so they can sign
// in with their password again. Pending security tokens are revoked.
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import {
  BadRequestError,
  NotFoundError,
} from '@/lib/errors';
import { revokeAllUserSecurityTokens } from '@/utils/user-security-tokens';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;

    if (id === session.userId) {
      throw new BadRequestError('Manage your own two-factor from Settings.');
    }

    const user = await prisma.user.findFirst({
      where: { id },
      select: { id: true, twoFactorEnabled: true },
    });
    if (!user) throw new NotFoundError('User not found');
    if (!user.twoFactorEnabled) {
      throw new BadRequestError(
        'Two-factor authentication is not enabled for this user.',
      );
    }

    await prisma.user.update({
      where: { id },
      data: { twoFactorEnabled: false },
    });
    await revokeAllUserSecurityTokens(id);

    return successResponse({ id }, 'Two-factor authentication disabled');
  } catch (err) {
    return handleApiError(err);
  }
}
