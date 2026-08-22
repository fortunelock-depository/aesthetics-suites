// src/app/api/users/[id]/password/route.ts
//
// Admin password rescue: a super admin sets a locked-out user a new
// password. The session epoch is bumped so EVERY existing session of that
// user dies - whoever holds the old password is out - and their pending
// security tokens are revoked. The user is notified by email.
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import {
  BadRequestError,
  NotFoundError,
} from '@/lib/errors';
import { revokeAllUserSecurityTokens } from '@/utils/user-security-tokens';
import { sendPasswordChangedEmail } from '@/lib/mail/auth-emails';
import { BCRYPT_SALT_ROUNDS } from '@/config/constants';
import { adminResetPasswordSchema } from '@/validations/user-validation';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;

    if (id === session.userId) {
      throw new BadRequestError(
        'Change your own password from Settings, where your current password is required.',
      );
    }

    const { password } = adminResetPasswordSchema.parse(await req.json());

    const user = await prisma.user.findFirst({
      where: { id },
      select: { id: true, email: true, fullname: true },
    });
    if (!user) throw new NotFoundError('User not found');

    await prisma.user.update({
      where: { id },
      data: {
        password: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
        sessionVersion: { increment: 1 },
      },
    });

    await revokeAllUserSecurityTokens(id);
    await sendPasswordChangedEmail(user);

    return successResponse(
      { id },
      'Password reset. The user has been signed out of all devices.',
    );
  } catch (err) {
    return handleApiError(err);
  }
}
