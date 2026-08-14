// src/app/api/admin/rooms/[id]/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { roomUpdateSchema } from '@/validations/hotel-validation';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { revalidatePublicRooms } from '@/utils/revalidate';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = roomUpdateSchema.parse(await req.json());

    const existing = await prisma.room.findFirst({
      where: { id },
      select: { id: true, roomType: { select: { slug: true } } },
    });
    if (!existing) throw new NotFoundError('Unit not found');

    const room = await prisma.room.update({ where: { id }, data: input });
    // Status flips (ACTIVE/MAINTENANCE) change the public unit count.
    revalidatePublicRooms(existing.roomType.slug);
    return successResponse(room, 'Unit updated');
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const active = await prisma.booking.count({
      where: {
        roomId: id,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      },
    });
    if (active > 0) {
      throw new ConflictError(
        'This unit has active bookings - resolve them first.',
      );
    }

    const unit = await prisma.room.findFirst({
      where: { id },
      select: { roomType: { select: { slug: true } } },
    });
    await prisma.room.delete({ where: { id } });
    if (unit) revalidatePublicRooms(unit.roomType.slug);
    return successResponse({ id }, 'Unit deleted');
  } catch (err) {
    return handleApiError(err);
  }
}
