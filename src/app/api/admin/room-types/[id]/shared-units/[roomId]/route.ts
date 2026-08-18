// src/app/api/admin/room-types/[id]/shared-units/[roomId]/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { revalidatePublicRooms } from '@/utils/revalidate';
import { NotFoundError } from '@/lib/errors';

/**
 * Stops this listing selling a unit it does not own. Existing bookings are
 * untouched: they already sit on the physical unit and keep blocking it.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; roomId: string }> },
) {
  try {
    await requireAdmin();
    const { id, roomId } = await params;

    const roomType = await prisma.roomType.findFirst({
      where: { id },
      select: { slug: true },
    });
    if (!roomType) throw new NotFoundError('Room type not found');

    const removed = await prisma.roomTypeSharedUnit.deleteMany({
      where: { roomTypeId: id, roomId },
    });
    if (removed.count === 0) throw new NotFoundError('That unit is not shared with this listing');

    revalidatePublicRooms(roomType.slug);
    return successResponse({ roomTypeId: id, roomId }, 'Unit unshared');
  } catch (err) {
    return handleApiError(err);
  }
}
