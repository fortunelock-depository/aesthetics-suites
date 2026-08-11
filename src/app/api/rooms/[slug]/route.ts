// src/app/api/rooms/[slug]/route.ts
import prisma, { ReviewStatus } from '@/lib/prisma';
import { successResponse, handleApiError } from '@/utils/api-response';
import { NotFoundError } from '@/middlewares/error-handler';

/** Public listing detail: full copy, gallery, and the rating summary. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const roomType = await prisma.roomType.findFirst({
      where: { slug, isPublished: true },
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
        airbnbUrl: true,
        minNights: true,
        photos: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, alt: true },
        },
      },
    });
    if (!roomType) throw new NotFoundError('Room not found');

    const rating = await prisma.review.aggregate({
      where: {
        roomTypeId: roomType.id,
        status: ReviewStatus.APPROVED,
        deletedAt: null,
      },
      _avg: { rating: true },
      _count: { _all: true },
    });

    return successResponse({
      ...roomType,
      rating: {
        average: Math.round((rating._avg.rating ?? 0) * 10) / 10,
        count: rating._count._all,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
