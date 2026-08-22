// src/lib/hotel/public-room-detail.ts
import 'server-only';
import { normalizeFaqs } from '@/lib/hotel/faqs';
import prisma, { ReviewStatus } from '@/lib/prisma';
import logger from '@/utils/logger';
import { activeUnitsByRoomType } from './units';

export interface IPublicRoomDetail {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string[];
  basePrice: number;
  currency: string;
  capacityAdults: number;
  capacityChildren: number;
  sizeSqm: number | null;
  unitCount: number;
  amenities: string[];
  minNights: number;
  /** Days before check-in that a cancellation is still refunded in full. */
  freeCancellationDays: number;
  airbnbUrl: string | null;
  photos: { url: string; alt: string | null }[];
  /**
   * Published sibling listings that sell the SAME physical units (a
   * two-bedroom apartment sold whole and as one bedroom). Booking either
   * takes the apartment for both, which the page explains.
   */
  alsoSoldAs: { name: string; slug: string }[];
  rating: { average: number; count: number } | null;
  /** First page of approved reviews (REVIEWS_PAGE_SIZE). */
  reviews: {
    id: string;
    guestName: string;
    rating: number;
    title: string | null;
    body: string;
    verifiedStay: boolean;
    createdAt: string;
  }[];
  /** Total approved reviews - drives the client pager. */
  reviewsTotal: number;
  /** Room-specific FAQs (admin-entered); may be empty. */
  faqs: { question: string; answer: string }[];
}

/** Public reviews page size, shared with the pager component. */
export const REVIEWS_PAGE_SIZE = 6;

const splitParagraphs = (text: string): string[] =>
  text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

/**
 * A published room's full detail + approved reviews. The DB is the ONLY
 * source of truth: unpublished or missing rooms 404, and an unreachable
 * DB reads as not-found rather than a crash.
 */
export async function getPublicRoomDetail(
  slug: string,
): Promise<IPublicRoomDetail | null> {
  try {
    const roomType = await prisma.roomType.findFirst({
      where: { slug, isPublished: true },
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!roomType) return null;

    const [aggregate, reviews, unitIndex] = await Promise.all([
      prisma.review.aggregate({
        // aggregate is NOT covered by the soft-delete extension (it only
        // scopes findMany/findFirst/count) - exclude deleted rows here so
        // the average can never disagree with the visible list below.
        where: {
          roomTypeId: roomType.id,
          status: ReviewStatus.APPROVED,
          deletedAt: null,
        },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      prisma.review.findMany({
        where: { roomTypeId: roomType.id, status: ReviewStatus.APPROVED },
        orderBy: { createdAt: 'desc' },
        take: REVIEWS_PAGE_SIZE,
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
      activeUnitsByRoomType(),
    ]);

    // Listings that share at least one ACTIVE unit with this one.
    const ownUnits = new Set(unitIndex.get(roomType.id) ?? []);
    const siblingIds = [...unitIndex.entries()]
      .filter(
        ([typeId, units]) =>
          typeId !== roomType.id && units.some((unit) => ownUnits.has(unit)),
      )
      .map(([typeId]) => typeId);
    const alsoSoldAs =
      siblingIds.length > 0
        ? await prisma.roomType.findMany({
            where: { id: { in: siblingIds }, isPublished: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: { name: true, slug: true },
          })
        : [];

    return {
      id: roomType.id,
      name: roomType.name,
      slug: roomType.slug,
      summary: roomType.summary,
      description: splitParagraphs(roomType.description),
      basePrice: roomType.basePrice,
      currency: roomType.currency,
      capacityAdults: roomType.capacityAdults,
      capacityChildren: roomType.capacityChildren,
      sizeSqm: roomType.sizeSqm,
      unitCount: ownUnits.size,
      // No stand-in list: three generic lines under an Amenities heading read
      // as filler and are indistinguishable from a room that genuinely has
      // only those. An empty list omits the section on the page.
      amenities: roomType.amenities,
      minNights: roomType.minNights,
      freeCancellationDays: roomType.freeCancellationDays,
      airbnbUrl: roomType.airbnbUrl,
      photos: roomType.photos.map((photo) => ({
        url: photo.url,
        alt: photo.alt,
      })),
      alsoSoldAs,
      rating:
        aggregate._count._all > 0
          ? {
              average: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
              count: aggregate._count._all,
            }
          : null,
      reviews: reviews.map(({ bookingId, createdAt, ...review }) => ({
        ...review,
        verifiedStay: Boolean(bookingId),
        createdAt: createdAt.toISOString(),
      })),
      reviewsTotal: aggregate._count._all,
      faqs: normalizeFaqs(roomType.faqs),
    };
  } catch (error) {
    logger.error({ error, slug }, 'Failed to load room detail');
    // Fail soft: an unreachable DB reads as "not found", never a crash.
    return null;
  }
}
