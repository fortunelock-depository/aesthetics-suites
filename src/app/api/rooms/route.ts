// src/app/api/rooms/route.ts
import prisma, { ReviewStatus } from '@/lib/prisma';
import { successResponse, handleApiError } from '@/utils/api-response';

/**
 * Public listing catalogue: published room types with cover photo and an
 * approved-review rating summary. Unpaginated by design - a hotel has a
 * handful of listings.
 */
export async function GET() {
  try {
    const roomTypes = await prisma.roomType.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        summary: true,
        basePrice: true,
        currency: true,
        capacityAdults: true,
        capacityChildren: true,
        sizeSqm: true,
        amenities: true,
        airbnbUrl: true,
        minNights: true,
        photos: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          select: { url: true, alt: true },
        },
      },
    });

    const ratings = await prisma.review.groupBy({
      by: ['roomTypeId'],
      where: { status: ReviewStatus.APPROVED, deletedAt: null },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const ratingByType = new Map(
      ratings.map((row) => [
        row.roomTypeId,
        {
          average: Math.round((row._avg.rating ?? 0) * 10) / 10,
          count: row._count._all,
        },
      ]),
    );

    return successResponse(
      roomTypes.map(({ photos, ...roomType }) => ({
        ...roomType,
        coverPhoto: photos[0] ?? null,
        rating: ratingByType.get(roomType.id) ?? null,
      })),
    );
  } catch (err) {
    return handleApiError(err);
  }
}
