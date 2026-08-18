// src/lib/hotel/availability.ts
//
// Unit-level availability. A unit is free for [checkIn, checkOut) when it is
// ACTIVE and has neither a blocking booking (PENDING with a live hold,
// CONFIRMED, or CHECKED_IN) nor a CalendarBlock (Airbnb import / manual)
// overlapping the half-open range. This is what makes cross-platform
// double-booking impossible once Airbnb calendars are synced.
//
// "Units of a room type" includes units SHARED into it from another
// listing (unitsSoldAs): a two-bedroom apartment sold both whole and as a
// single bedroom is one Room, so a booking under either listing occupies
// it for both - the queries below need no special casing for that.
import 'server-only';
import prisma, {
  BookingStatus,
  RoomStatus,
  type TransactionClient,
} from '@/lib/prisma';
import { unitsSoldAs } from './units';

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
      ...unitsSoldAs(roomTypeId),
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
