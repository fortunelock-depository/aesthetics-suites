// src/lib/hotel/public-room-detail.ts
import 'server-only';
import { normalizeFaqs } from '@/lib/hotel/faqs';
import prisma, { ReviewStatus } from '@/lib/prisma';
import logger from '@/utils/logger';
import {
  DEMO_ROOM_TYPES,
  DEMO_ROOM_CARDS,
  DEMO_REVIEWS,
} from '@/static-data/demo-rooms';
import { unsplash } from '@/static-data/home';

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
  airbnbUrl: string | null;
  photos: { url: string; alt: string | null }[];
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

/** The static demo detail for a slug (until real rooms are published). */
function demoDetail(slug: string): IPublicRoomDetail | null {
  const index = DEMO_ROOM_CARDS.findIndex((card) => card.slug === slug);
  if (index === -1) return null;
  const demo = DEMO_ROOM_TYPES[index];
  const card = DEMO_ROOM_CARDS[index];
  // Second gallery shot: borrow the next room's photo for variety.
  const next = DEMO_ROOM_TYPES[(index + 1) % DEMO_ROOM_TYPES.length];

  return {
    id: card.id,
    name: demo.name,
    slug,
    summary: demo.summary,
    description: splitParagraphs(demo.description),
    basePrice: demo.basePrice,
    currency: 'GHS',
    capacityAdults: demo.capacityAdults,
    capacityChildren: demo.capacityChildren,
    sizeSqm: demo.sizeSqm,
    unitCount: demo.units.length,
    amenities: demo.amenities,
    minNights: 1,
    airbnbUrl: null,
    photos: [
      { url: unsplash(demo.photo.id, 1200), alt: demo.photo.alt },
      { url: unsplash(next.photo.id, 1200), alt: next.photo.alt },
    ],
    rating: card.rating,
    faqs: (demo.faqs ?? []).map((faq) => ({ ...faq })),
    reviewsTotal: (DEMO_REVIEWS[index] ?? []).length,
    reviews: (DEMO_REVIEWS[index] ?? []).map((review, reviewIndex) => ({
      id: `demo-${index}-${reviewIndex}`,
      ...review,
    })),
  };
}

/**
 * A published room's full detail + approved reviews. DB first; when the DB
 * has no published rooms (or is unreachable) the demo set answers, so the
 * detail pages work in the static phase too.
 */
export async function getPublicRoomDetail(
  slug: string,
): Promise<IPublicRoomDetail | null> {
  try {
    const roomType = await prisma.roomType.findFirst({
      where: { slug, isPublished: true },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
        _count: {
          select: { units: { where: { status: 'ACTIVE', deletedAt: null } } },
        },
      },
    });
    if (!roomType) return demoDetail(slug);

    const [aggregate, reviews] = await Promise.all([
      prisma.review.aggregate({
        where: { roomTypeId: roomType.id, status: ReviewStatus.APPROVED },
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
    ]);

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
      unitCount: roomType._count.units,
      amenities: roomType.amenities,
      minNights: roomType.minNights,
      airbnbUrl: roomType.airbnbUrl,
      photos: roomType.photos.map((photo) => ({
        url: photo.url,
        alt: photo.alt,
      })),
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
    return demoDetail(slug);
  }
}
