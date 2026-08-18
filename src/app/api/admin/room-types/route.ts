// src/app/api/admin/room-types/route.ts
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
  roomTypeCreateSchema,
  roomTypesQuerySchema,
} from '@/validations/hotel-validation';
import { generateSlug } from '@/utils/generate-slug';
import { revalidatePublicRooms } from '@/utils/revalidate';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const query = roomTypesQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const where: Prisma.RoomTypeWhereInput = {
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(query.isPublished !== undefined
        ? { isPublished: query.isPublished }
        : {}),
    };

    const [roomTypes, totalItems] = await Promise.all([
      prisma.roomType.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        // Explicit select mirroring IRoomTypeRow (the users routes'
        // userSelect pattern) - a raw include ships internal columns
        // (deletedAt) the DTO never declared.
        select: {
          id: true,
          name: true,
          slug: true,
          summary: true,
          description: true,
          basePrice: true,
          currency: true,
          capacityAdults: true,
          capacityChildren: true,
          sizeSqm: true,
          amenities: true,
          faqs: true,
          airbnbUrl: true,
          minNights: true,
          isPublished: true,
          sortOrder: true,
          baseOccupancy: true,
          extraGuestFeePerNight: true,
          freeCancellationDays: true,
          createdAt: true,
          updatedAt: true,
          photos: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
          _count: { select: { units: true, sharedUnits: true, bookings: true } },
        },
      }),
      prisma.roomType.count({ where }),
    ]);

    return paginatedResponse(roomTypes, {
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
    const input = roomTypeCreateSchema.parse(await req.json());

    const roomType = await prisma.roomType.create({
      data: { ...input, slug: generateSlug(input.name) },
    });

    revalidatePublicRooms(roomType.slug);
    return successResponse(roomType, 'Room type created', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
