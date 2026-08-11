// src/app/api/users/[id]/route.ts
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '@/middlewares/error-handler';
import { updateUserDetailsSchema } from '@/validations/user-validation';

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

/** Single user for the detail page. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundError('User not found');

    return successResponse(user, 'User retrieved');
  } catch (err) {
    return handleApiError(err);
  }
}

/** Detail update (name/email/phone). Role changes live at /role. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const input = updateUserDetailsSchema.parse(await req.json());

    const existing = await prisma.user.findFirst({
      where: { id },
      select: { id: true, email: true },
    });
    if (!existing) throw new NotFoundError('User not found');

    const email = input.email?.toLowerCase().trim();
    if (email && email !== existing.email) {
      const taken = await prisma.user.findFirst({
        where: { email, NOT: { id } },
        select: { id: true },
      });
      if (taken) {
        throw new ConflictError('A user with that email already exists');
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.fullname !== undefined ? { fullname: input.fullname } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      },
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
