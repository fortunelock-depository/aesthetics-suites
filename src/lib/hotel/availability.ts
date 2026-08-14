// src/lib/hotel/availability.ts
//
// Unit-level availability. A unit is free for [checkIn, checkOut) when it is
// ACTIVE and has neither a blocking booking (PENDING with a live hold,
// CONFIRMED, or CHECKED_IN) nor a CalendarBlock (Airbnb import / manual)
// overlapping the half-open range. This is what makes cross-platform
// double-booking impossible once Airbnb calendars are synced.
import 'server-only';
import prisma, {
  BookingStatus,
  RoomStatus,
  type TransactionClient,
} from '@/lib/prisma';

/** Booking statuses that occupy a unit's calendar. */
export const BLOCKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
];

const overlapWhere = (checkIn: Date, checkOut: Date) => ({
  // Half-open overlap: start < checkOut AND end > checkIn.
  bookings: {
    some: {
      status: { in: BLOCKING_STATUSES },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      // An expired-but-not-yet-swept PENDING hold doesn't block.
      OR: [
        { status: { not: BookingStatus.PENDING } },
        { holdExpiresAt: { gt: new Date() } },
      ],
    },
  },
  blocks: {
    some: {
      startDate: { lt: checkOut },
      endDate: { gt: checkIn },
    },
  },
});

export interface IAvailabilityResult {
  availableUnits: number;
  /** The unit a new booking would be assigned to (first free). */
  unitId: string | null;
}

/**
 * Free units of a room type for the range. Accepts a transaction client so
 * booking creation can re-check availability under its advisory lock.
 */
export async function findAvailability(
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date,
  db: TransactionClient = prisma,
): Promise<IAvailabilityResult> {
  const { bookings, blocks } = overlapWhere(checkIn, checkOut);

  const freeUnits = await db.room.findMany({
    where: {
      roomTypeId,
      status: RoomStatus.ACTIVE,
      NOT: [{ bookings }, { blocks }],
    },
    select: { id: true },
    orderBy: { name: 'asc' },
  });

  return {
    availableUnits: freeUnits.length,
    unitId: freeUnits[0]?.id ?? null,
  };
}

/** True when a SPECIFIC unit is free for the range (manual bookings). */
export async function isUnitFree(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  db: TransactionClient = prisma,
): Promise<boolean> {
  const { bookings, blocks } = overlapWhere(checkIn, checkOut);
  const unit = await db.room.findFirst({
    where: {
      id: roomId,
      status: RoomStatus.ACTIVE,
      NOT: [{ bookings }, { blocks }],
    },
    select: { id: true },
  });
  return Boolean(unit);
}
