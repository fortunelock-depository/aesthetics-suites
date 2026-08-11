// src/app/api/users/[id]/route.ts
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { BadRequestError } from '@/middlewares/error-handler';
import { updateUserSchema } from '@/validations/user-validation';

const userSelect = {
  id: true,
  email: true,
  fullname: true,
  phone: true,
  role: true,
  twoFactorEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Profile/role update. Role changes are the SUPER_ADMIN boundary. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const input = updateUserSchema.parse(await req.json());

    if (input.role && id === session.userId) {
      throw new BadRequestError('You cannot change your own role.');
    }

    const user = await prisma.user.update({
      where: { id },
      data: input,
      select: userSelect,
    });

    return successResponse(user, 'User updated');
  } catch (err) {
    return handleApiError(err);
  }
}

/** Soft-deletes a user (the Prisma extension rewrites delete -> deletedAt). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;

    if (id === session.userId) {
      throw new BadRequestError('You cannot delete your own account.');
    }

    await prisma.user.delete({ where: { id } });
    return successResponse({ id }, 'User deleted');
  } catch (err) {
    return handleApiError(err);
  }
}
