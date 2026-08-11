// src/app/api/admin/room-types/[id]/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { roomTypeUpdateSchema } from '@/validations/hotel-validation';
import { generateSlug } from '@/utils/generate-slug';
import { revalidatePublicRooms } from '@/utils/revalidate';
import { ConflictError, NotFoundError } from '@/middlewares/error-handler';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const roomType = await prisma.roomType.findFirst({
      where: { id },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
        units: { orderBy: { name: 'asc' } },
        seasonRates: { orderBy: { startDate: 'asc' } },
      },
    });
    if (!roomType) throw new NotFoundError('Room type not found');

    return successResponse(roomType);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = roomTypeUpdateSchema.parse(await req.json());

    const existing = await prisma.roomType.findFirst({
      where: { id },
      select: { slug: true },
    });
    if (!existing) throw new NotFoundError('Room type not found');

    const roomType = await prisma.roomType.update({
      where: { id },
      data: {
        ...input,
        // Renames keep URLs honest; the old slug is revalidated below.
        ...(input.name ? { slug: generateSlug(input.name) } : {}),
      },
    });

    revalidatePublicRooms(existing.slug);
    if (roomType.slug !== existing.slug) revalidatePublicRooms(roomType.slug);
    return successResponse(roomType, 'Room type updated');
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

    const existing = await prisma.roomType.findFirst({
      where: { id },
      select: {
        slug: true,
        _count: {
          select: {
            bookings: {
              where: { status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
            },
          },
        },
      },
    });
    if (!existing) throw new NotFoundError('Room type not found');
    if (existing._count.bookings > 0) {
      throw new ConflictError(
        'This room type has active bookings - resolve them first.',
      );
    }

    await prisma.roomType.delete({ where: { id } });
    revalidatePublicRooms(existing.slug);
    return successResponse({ id }, 'Room type deleted');
  } catch (err) {
    return handleApiError(err);
  }
}
