// src/app/api/admin/reviews/route.ts
import type { NextRequest } from 'next/server';
import type { Prisma } from '@/lib/prisma';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { paginatedResponse, handleApiError } from '@/utils/api-response';
import { reviewsQuerySchema } from '@/validations/hotel-validation';

/** Moderation queue: filter by status (default: everything, newest first). */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const query = reviewsQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const where: Prisma.ReviewWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.roomTypeId ? { roomTypeId: query.roomTypeId } : {}),
    };

    const [reviews, totalItems] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          roomType: { select: { id: true, name: true, slug: true } },
          booking: { select: { code: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return paginatedResponse(reviews, {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / query.limit),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
