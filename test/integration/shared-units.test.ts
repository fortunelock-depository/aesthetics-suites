// Shared inventory (derived room types): one physical two-bedroom apartment
// owned by the "whole apartment" listing and ALSO sold under a "one bedroom"
// listing. Whichever listing a guest books, the apartment is taken for
// both - two parties can never share it. These tests pin that down at the
// availability layer, the seat paths (website + manual), and the public
// counts, so the join table can never be silently ignored by a new query.
import { describe, expect, it } from 'vitest';
import prisma, { BookingStatus, RoomStatus } from '@/lib/prisma';
import { findAvailability } from '@/lib/hotel/availability';
import {
  createManualBooking,
  createWebsiteBooking,
} from '@/lib/hotel/booking-service';
import { activeUnitsByRoomType } from '@/lib/hotel/units';
import { parseDateOnly } from '@/lib/hotel/dates';
import { ConflictError, BadRequestError } from '@/lib/errors';
import { createRoomTypeWithUnits, futureDate, guestInput } from './helpers';

const day = (offset: number) => parseDateOnly(futureDate(offset));

/** Three apartments owned by `whole`, all shared into `oneBed`. */
async function apartments() {
  const whole = await createRoomTypeWithUnits({
    units: 3,
    basePrice: 200_000,
    capacityAdults: 4,
  });
  const oneBed = await createRoomTypeWithUnits({ units: 0, basePrice: 120_000 });
  await prisma.roomTypeSharedUnit.createMany({
    data: whole.units.map((unit) => ({
      roomTypeId: oneBed.roomType.id,
      roomId: unit.id,
    })),
  });
  return { whole, oneBed };
}

const staff = () =>
  prisma.user.create({
    data: {
      email: `staff-${Math.random().toString(16).slice(2)}@test.local`,
      password: 'not-a-real-hash',
      fullname: 'Front Desk',
    },
  });

describe('shared units - availability', () => {
  it('a listing with no owned units sells the units shared into it', async () => {
    const { whole, oneBed } = await apartments();

    const asWhole = await findAvailability(whole.roomType.id, day(10), day(12));
    const asOneBed = await findAvailability(oneBed.roomType.id, day(10), day(12));

    expect(asWhole.availableUnits).toBe(3);
    expect(asOneBed.availableUnits).toBe(3);
    // Same physical inventory, same first-free unit.
    expect(asOneBed.unitId).toBe(asWhole.unitId);
    expect(whole.units.map((u) => u.id)).toContain(asOneBed.unitId);
  });

  it('a one-bedroom stay takes the whole apartment away from the whole-apartment listing', async () => {
    const { whole, oneBed } = await apartments();

    const stay = await createWebsiteBooking(
      guestInput(oneBed.roomType.slug, futureDate(10), futureDate(12)),
    );
    expect(stay.booking.roomTypeId).toBe(oneBed.roomType.id);
    expect(whole.units.map((u) => u.id)).toContain(stay.booking.roomId);

    const asWhole = await findAvailability(whole.roomType.id, day(10), day(12));
    const asOneBed = await findAvailability(oneBed.roomType.id, day(10), day(12));
    expect(asWhole.availableUnits).toBe(2);
    expect(asOneBed.availableUnits).toBe(2);
    // The seated apartment is gone from BOTH listings.
    expect(asWhole.unitId).not.toBe(stay.booking.roomId);
    expect(asOneBed.unitId).not.toBe(stay.booking.roomId);
  });

  it('a whole-apartment stay blocks the one-bedroom listing on that apartment', async () => {
    const { whole, oneBed } = await apartments();
    // Take all three apartments as whole-apartment stays.
    for (let i = 0; i < 3; i++) {
      await createWebsiteBooking(
        guestInput(whole.roomType.slug, futureDate(10), futureDate(12), {
          guestEmail: `guest${i}@test.local`,
        }),
      );
    }

    const asOneBed = await findAvailability(oneBed.roomType.id, day(10), day(12));
    expect(asOneBed.availableUnits).toBe(0);
    await expect(
      createWebsiteBooking(
        guestInput(oneBed.roomType.slug, futureDate(10), futureDate(12)),
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    // Back-to-back is still fine (half-open ranges are unchanged).
    const later = await findAvailability(oneBed.roomType.id, day(12), day(14));
    expect(later.availableUnits).toBe(3);
  });

  it('a MAINTENANCE apartment is out of inventory for every listing that sells it', async () => {
    const { whole, oneBed } = await apartments();
    await prisma.room.update({
      where: { id: whole.units[0].id },
      data: { status: RoomStatus.MAINTENANCE },
    });
    expect((await findAvailability(whole.roomType.id, day(10), day(12))).availableUnits).toBe(2);
    expect((await findAvailability(oneBed.roomType.id, day(10), day(12))).availableUnits).toBe(2);
  });
});

describe('shared units - manual bookings', () => {
  it('staff can seat a one-bedroom stay on a shared apartment explicitly', async () => {
    const { whole, oneBed } = await apartments();
    const actor = await staff();

    const booking = await createManualBooking(
      {
        roomTypeId: oneBed.roomType.id,
        roomId: whole.units[1].id,
        checkIn: futureDate(10),
        checkOut: futureDate(11),
        adults: 1,
        children: 0,
        guestName: 'Walk In',
        guestEmail: 'walkin@test.local',
      },
      actor.id,
    );
    expect(booking.status).toBe(BookingStatus.CONFIRMED);
    expect(booking.roomId).toBe(whole.units[1].id);

    // And that apartment is now unavailable to the whole-apartment listing.
    const asWhole = await findAvailability(whole.roomType.id, day(10), day(11));
    expect(asWhole.availableUnits).toBe(2);
    expect(asWhole.unitId).not.toBe(whole.units[1].id);
  });

  it('rejects seating a stay on a unit the listing neither owns nor shares', async () => {
    const { whole } = await apartments();
    const unrelated = await createRoomTypeWithUnits({ units: 1 });
    const actor = await staff();

    await expect(
      createManualBooking(
        {
          roomTypeId: whole.roomType.id,
          roomId: unrelated.units[0].id,
          checkIn: futureDate(10),
          checkOut: futureDate(11),
          adults: 1,
          children: 0,
          guestName: 'Walk In',
          guestEmail: 'walkin@test.local',
        },
        actor.id,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});

describe('shared units - public counts', () => {
  it('counts a shared apartment under every listing that sells it, once each', async () => {
    const { whole, oneBed } = await apartments();
    const index = await activeUnitsByRoomType();
    expect(index.get(whole.roomType.id)).toHaveLength(3);
    expect(index.get(oneBed.roomType.id)).toHaveLength(3);
    expect(new Set(index.get(oneBed.roomType.id))).toEqual(
      new Set(whole.units.map((u) => u.id)),
    );
  });
});
