// src/app/api/admin/room-types/[id]/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { roomTypeUpdateSchema } from '@/validations/hotel-validation';
import { generateSlug } from '@/utils/generate-slug';
import { revalidatePublicRooms } from '@/utils/revalidate';
import { ConflictError, NotFoundError } from '@/lib/errors';

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
        // Owned units, each with the sibling listings it is also sold under.
        units: {
          orderBy: { name: 'asc' },
          include: {
            sharedWith: {
              where: { roomType: { deletedAt: null } },
              select: { roomType: { select: { id: true, name: true } } },
            },
          },
        },
        // Units owned elsewhere that this listing also sells. Relation
        // includes bypass the soft-delete extension, hence the explicit
        // deletedAt filter on the unit.
        sharedUnits: {
          where: { room: { deletedAt: null } },
          include: {
            room: {
              include: { roomType: { select: { id: true, name: true } } },
            },
          },
        },
        seasonRates: { orderBy: { startDate: 'asc' } },
      },
    });
    if (!roomType) throw new NotFoundError('Room type not found');

    return successResponse({
      ...roomType,
      units: roomType.units.map(({ sharedWith, ...unit }) => ({
        ...unit,
        sharedWith: sharedWith.map((link) => link.roomType),
      })),
      // Flattened: the unit row plus who owns it, sorted by name.
      sharedUnits: roomType.sharedUnits
        .map((link) => link.room)
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
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
