// src/lib/hotel/public-rooms.ts
import 'server-only';
import prisma, { ReviewStatus } from '@/lib/prisma';
import logger from '@/utils/logger';
import { activeUnitsByRoomType } from './units';

export interface IPublicRoomCard {
  id: string;
  name: string;
  slug: string;
  summary: string;
  /** Minor units per night. */
  basePrice: number;
  currency: string;
  capacityAdults: number;
  capacityChildren: number;
  sizeSqm: number | null;
  /** ACTIVE physical units behind this listing. */
  unitCount: number;
  coverPhoto: { url: string; alt: string | null } | null;
  rating: { average: number; count: number } | null;
}

/**
 * Published room types for the landing page grid. Fails SOFT (empty list)
 * so a DB outage or an unmigrated build environment degrades to the honest
 * empty state instead of crashing the public homepage.
 */
export async function getPublicRoomCards(): Promise<IPublicRoomCard[]> {
  try {
    const [roomTypes, ratings, unitIndex] = await Promise.all([
      prisma.roomType.findMany({
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
          photos: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
            select: { url: true, alt: true },
          },
        },
      }),
      prisma.review.groupBy({
        by: ['roomTypeId'],
        where: { status: ReviewStatus.APPROVED, deletedAt: null },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      // Owned + shared units per listing (a shared apartment counts for
      // every listing that sells it).
      activeUnitsByRoomType(),
    ]);

    const ratingByType = new Map(
      ratings.map((row) => [
        row.roomTypeId,
        {
          average: Math.round((row._avg.rating ?? 0) * 10) / 10,
          count: row._count._all,
        },
      ]),
    );

    return roomTypes.map(({ photos, ...roomType }) => ({
      ...roomType,
      unitCount: unitIndex.get(roomType.id)?.length ?? 0,
      coverPhoto: photos[0] ?? null,
      rating: ratingByType.get(roomType.id) ?? null,
    }));
  } catch (error) {
    logger.error({ error }, 'Failed to load public room cards');
    return [];
  }
}
