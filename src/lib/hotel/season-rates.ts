// src/lib/hotel/season-rates.ts
//
// Season-rate integrity helpers. Overlapping ranges are rejected outright:
// pricing resolves overlaps latest-created-first, but two live rates over
// the same night is almost always an admin mistake and makes quotes depend
// on creation order - refusing is clearer than guessing.
import 'server-only';
import prisma from '@/lib/prisma';
import { ConflictError } from '@/lib/errors';

/**
 * Throws when [startDate, endDate) overlaps another season rate of the
 * same room type (half-open, so back-to-back seasons sharing a boundary
 * date are fine). Pass excludeId when updating an existing rate.
 */
export async function assertNoSeasonOverlap(
  roomTypeId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string,
): Promise<void> {
  const clash = await prisma.seasonRate.findFirst({
    where: {
      roomTypeId,
      startDate: { lt: endDate },
      endDate: { gt: startDate },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true },
  });
  if (clash) {
    throw new ConflictError(
      `This range overlaps the existing season "${clash.name}". Adjust the dates or edit that season instead.`,
    );
  }
}
