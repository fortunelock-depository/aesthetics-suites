// test/integration/helpers.ts
//
// Factories for the integration suite. Names carry a per-run counter
// because RoomType.name/slug and Room.name are globally unique.
import prisma from '@/lib/prisma';
import { toDateOnlyString } from '@/lib/hotel/dates';

let seq = 0;

/** "YYYY-MM-DD" `days` days from now (UTC). */
export const futureDate = (days: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnlyString(date);
};

export interface IRoomTypeFactoryOptions {
  units?: number;
  basePrice?: number;
  minNights?: number;
  capacityAdults?: number;
  capacityChildren?: number;
  baseOccupancy?: number;
  extraGuestFeePerNight?: number;
  freeCancellationDays?: number;
  isPublished?: boolean;
}

/** A room type plus N ACTIVE units, ready to book. */
export async function createRoomTypeWithUnits(
  options: IRoomTypeFactoryOptions = {},
) {
  seq += 1;
  const {
    units = 1,
    basePrice = 100_000,
    minNights = 1,
    capacityAdults = 2,
    capacityChildren = 1,
    baseOccupancy = 2,
    extraGuestFeePerNight = 0,
    freeCancellationDays = 2,
    isPublished = true,
  } = options;

  const roomType = await prisma.roomType.create({
    data: {
      name: `Test Suite ${seq}`,
      slug: `test-suite-${seq}`,
      summary: 'A room type created by the integration suite.',
      description: 'Integration test fixture.',
      basePrice,
      minNights,
      capacityAdults,
      capacityChildren,
      baseOccupancy,
      extraGuestFeePerNight,
      freeCancellationDays,
      isPublished,
      units: {
        create: Array.from({ length: units }, (_, index) => ({
          name: `Unit ${seq}-${index + 1}`,
        })),
      },
    },
    include: { units: { orderBy: { name: 'asc' } } },
  });

  return { roomType, units: roomType.units };
}

/** Standard guest fields for createWebsiteBooking. */
export function guestInput(
  roomTypeSlug: string,
  checkIn: string,
  checkOut: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    roomTypeSlug,
    checkIn,
    checkOut,
    adults: 2,
    children: 0,
    guestName: 'Test Guest',
    guestEmail: 'guest@test.local',
    ...overrides,
  };
}
