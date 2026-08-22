// src/app/api/users/[id]/role/route.ts
//
// Role changes are their own endpoint so the permission move is a
// deliberate call, never a side effect of a profile edit. Takes effect
// immediately: resolveSession reads the role live from
// the DB on every request, so open sessions gain/lose access next request.
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import {
  BadRequestError,
  NotFoundError,
} from '@/lib/errors';
import { updateUserRoleSchema } from '@/validations/user-validation';

const userSelect = {
  id: true,
  email: true,
  fullname: true,
  phone: true,
  role: true,
  twoFactorEnabled: true,
  profilePhoto: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const { role } = updateUserRoleSchema.parse(await req.json());

    if (id === session.userId) {
      throw new BadRequestError('You cannot change your own role.');
    }

    const existing = await prisma.user.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError('User not found');

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: userSelect,
    });

    return successResponse(user, 'Role updated');
  } catch (err) {
    return handleApiError(err);
  }
}
