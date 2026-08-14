// src/app/api/admin/rooms/route.ts
import type { NextRequest } from 'next/server';
import type { Prisma } from '@/lib/prisma';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import {
  paginatedResponse,
  successResponse,
  handleApiError,
} from '@/utils/api-response';
import {
  roomCreateSchema,
  roomsQuerySchema,
} from '@/validations/hotel-validation';
import { NotFoundError } from '@/lib/errors';
import { revalidatePublicRooms } from '@/utils/revalidate';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const query = roomsQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const where: Prisma.RoomWhereInput = {
      ...(query.roomTypeId ? { roomTypeId: query.roomTypeId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [rooms, totalItems] = await Promise.all([
      prisma.room.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { roomType: { select: { id: true, name: true } } },
      }),
      prisma.room.count({ where }),
    ]);

    return paginatedResponse(rooms, {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / query.limit),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = roomCreateSchema.parse(await req.json());

    const roomType = await prisma.roomType.findFirst({
      where: { id: input.roomTypeId },
      select: { id: true, slug: true },
    });
    if (!roomType) throw new NotFoundError('Room type not found');

    const room = await prisma.room.create({ data: input });
    // Unit count and per-unit availability show on the public room pages.
    revalidatePublicRooms(roomType.slug);
    return successResponse(room, 'Unit created', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
