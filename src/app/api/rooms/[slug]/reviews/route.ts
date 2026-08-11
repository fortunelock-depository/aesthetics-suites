// src/app/api/rooms/[slug]/reviews/route.ts
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import prisma, { BookingStatus, ReviewStatus } from '@/lib/prisma';
import {
  paginatedResponse,
  successResponse,
  handleApiError,
} from '@/utils/api-response';
import {
  reviewCreateSchema,
  reviewsQuerySchema,
} from '@/validations/hotel-validation';
import { ratelimit } from '@/lib/rate-limit';
import {
  NotFoundError,
  TooManyRequestsError,
} from '@/middlewares/error-handler';

async function publishedRoomType(slug: string) {
  const roomType = await prisma.roomType.findFirst({
    where: { slug, isPublished: true },
    select: { id: true },
  });
  if (!roomType) throw new NotFoundError('Room not found');
  return roomType;
}

/** Approved reviews for a listing, newest first (shown under the listing). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const roomType = await publishedRoomType(slug);
    const query = reviewsQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const where = {
      roomTypeId: roomType.id,
      status: ReviewStatus.APPROVED,
    };

    const [reviews, totalItems] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          guestName: true,
          rating: true,
          title: true,
          body: true,
          bookingId: true,
          createdAt: true,
        },
      }),
      prisma.review.count({ where }),
    ]);

    return paginatedResponse(
      // A linked booking = verified stay; the id itself stays private.
      reviews.map(({ bookingId, ...review }) => ({
        ...review,
        verifiedStay: Boolean(bookingId),
      })),
      {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / query.limit),
      },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

/** Submits a review; it enters PENDING moderation and is never live at once. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const headersList = await headers();
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    const { success } = await ratelimit.limit(`review:${ip}`);
    if (!success) throw new TooManyRequestsError();

    const { slug } = await params;
    const roomType = await publishedRoomType(slug);
    const input = reviewCreateSchema.parse(await req.json());

    // Honeypot filled: pretend success, store nothing.
    if (input.website) return successResponse({ status: 'PENDING' });

    // A matching checked-out booking for this room type marks the review
    // as a verified stay.
    let bookingId: string | undefined;
    if (input.bookingCode) {
      const booking = await prisma.booking.findFirst({
        where: {
          code: input.bookingCode.toUpperCase().trim(),
          roomTypeId: roomType.id,
          guestEmail: input.guestEmail.toLowerCase().trim(),
          status: {
            in: [BookingStatus.CHECKED_OUT, BookingStatus.CHECKED_IN],
          },
        },
        select: { id: true },
      });
      bookingId = booking?.id;
    }

    const review = await prisma.review.create({
      data: {
        roomTypeId: roomType.id,
        bookingId,
        guestName: input.guestName,
        guestEmail: input.guestEmail.toLowerCase().trim(),
        rating: input.rating,
        title: input.title,
        body: input.body,
      },
      select: { id: true, status: true },
    });

    return successResponse(
      review,
      'Thanks - your review is awaiting moderation.',
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
