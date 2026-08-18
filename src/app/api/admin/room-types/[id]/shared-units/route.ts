// src/app/api/admin/room-types/[id]/shared-units/route.ts
//
// Shared inventory for a listing: which units owned by OTHER listings it
// also sells (the two-bedroom apartment sold whole AND as one bedroom).
// GET lists what is linked and what could be; POST links one more.
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { sharedUnitLinkSchema } from '@/validations/hotel-validation';
import { revalidatePublicRooms } from '@/utils/revalidate';
import { BadRequestError, NotFoundError } from '@/lib/errors';

const unitSelect = {
  id: true,
  name: true,
  floor: true,
  status: true,
  roomType: { select: { id: true, name: true } },
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const roomType = await prisma.roomType.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!roomType) throw new NotFoundError('Room type not found');

    const [linked, candidates] = await Promise.all([
      prisma.room.findMany({
        where: { sharedWith: { some: { roomTypeId: id } } },
        orderBy: { name: 'asc' },
        select: unitSelect,
      }),
      // Owned by a live sibling listing and not yet shared into this one.
      prisma.room.findMany({
        where: {
          roomTypeId: { not: id },
          roomType: { deletedAt: null },
          sharedWith: { none: { roomTypeId: id } },
        },
        orderBy: [{ roomType: { name: 'asc' } }, { name: 'asc' }],
        select: unitSelect,
      }),
    ]);

    return successResponse({ linked, candidates });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { roomId } = sharedUnitLinkSchema.parse(await req.json());

    const [roomType, room] = await Promise.all([
      prisma.roomType.findFirst({ where: { id }, select: { slug: true } }),
      prisma.room.findFirst({
        where: { id: roomId },
        select: { id: true, roomTypeId: true },
      }),
    ]);
    if (!roomType) throw new NotFoundError('Room type not found');
    if (!room) throw new NotFoundError('Unit not found');
    if (room.roomTypeId === id) {
      throw new BadRequestError('This listing already owns that unit.');
    }

    // Idempotent: linking twice is a no-op, not a 409.
    await prisma.roomTypeSharedUnit.upsert({
      where: { roomTypeId_roomId: { roomTypeId: id, roomId } },
      create: { roomTypeId: id, roomId },
      update: {},
    });

    // The public unit count and availability of this listing just changed.
    revalidatePublicRooms(roomType.slug);
    return successResponse({ roomTypeId: id, roomId }, 'Unit shared', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
