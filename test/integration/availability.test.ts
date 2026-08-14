// Unit-level availability against a real database: half-open overlap
// semantics, hold liveness, calendar blocks, unit status, and capacity
// counting - the exact invariants booking creation re-checks under its lock.
import { describe, expect, it } from 'vitest';
import prisma, { BookingStatus, RoomStatus } from '@/lib/prisma';
import { findAvailability, isUnitFree } from '@/lib/hotel/availability';
import { parseDateOnly } from '@/lib/hotel/dates';
import { createRoomTypeWithUnits, futureDate } from './helpers';

const day = (offset: number) => parseDateOnly(futureDate(offset));

async function seedBooking(
  roomTypeId: string,
  roomId: string,
  checkInDays: number,
  checkOutDays: number,
  status: BookingStatus,
  holdExpiresAt: Date | null = null,
) {
  return prisma.booking.create({
    data: {
      code: `ASB-TEST-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
      roomTypeId,
      roomId,
      guestName: 'Seed Guest',
      guestEmail: 'seed@test.local',
      checkIn: day(checkInDays),
      checkOut: day(checkOutDays),
      nights: checkOutDays - checkInDays,
      status,
      baseAmount: 100_000,
      totalAmount: 100_000,
      holdExpiresAt,
    },
  });
}

describe('findAvailability / isUnitFree', () => {
  it('counts free units and reports the first free unit', async () => {
    const { roomType, units } = await createRoomTypeWithUnits({ units: 2 });
    const result = await findAvailability(roomType.id, day(10), day(12));
    expect(result.availableUnits).toBe(2);
    expect(result.unitId).toBe(units[0].id);
  });

  it('treats back-to-back stays as non-overlapping (half-open ranges)', async () => {
    const { roomType, units } = await createRoomTypeWithUnits();
    await seedBooking(roomType.id, units[0].id, 10, 12, BookingStatus.CONFIRMED);

    // Checking in on the earlier stay's checkout day is allowed.
    expect(await isUnitFree(units[0].id, day(12), day(14))).toBe(true);
    // Any true overlap is not.
    expect(await isUnitFree(units[0].id, day(11), day(13))).toBe(false);
    expect(await isUnitFree(units[0].id, day(9), day(11))).toBe(false);
  });

  it('a CONFIRMED booking blocks; an expired PENDING hold does not', async () => {
    const { roomType, units } = await createRoomTypeWithUnits();

    const hold = await seedBooking(
      roomType.id,
      units[0].id,
      10,
      12,
      BookingStatus.PENDING,
      new Date(Date.now() - 60_000),
    );
    expect(await isUnitFree(units[0].id, day(10), day(12))).toBe(true);

    // A live hold blocks.
    await prisma.booking.update({
      where: { id: hold.id },
      data: { holdExpiresAt: new Date(Date.now() + 30 * 60_000) },
    });
    expect(await isUnitFree(units[0].id, day(10), day(12))).toBe(false);
  });

  it('CANCELLED and EXPIRED bookings never block', async () => {
    const { roomType, units } = await createRoomTypeWithUnits();
    await seedBooking(roomType.id, units[0].id, 10, 12, BookingStatus.CANCELLED);
    await seedBooking(roomType.id, units[0].id, 10, 12, BookingStatus.EXPIRED);
    expect(await isUnitFree(units[0].id, day(10), day(12))).toBe(true);
  });

  it('a CalendarBlock (Airbnb import) blocks its range, half-open', async () => {
    const { roomType, units } = await createRoomTypeWithUnits();
    await prisma.calendarBlock.create({
      data: {
        roomId: units[0].id,
        startDate: day(10),
        endDate: day(12),
        source: 'AIRBNB',
        externalUid: 'evt-1@airbnb.test',
      },
    });
    expect(await isUnitFree(units[0].id, day(11), day(13))).toBe(false);
    expect(await isUnitFree(units[0].id, day(12), day(14))).toBe(true);
    const result = await findAvailability(roomType.id, day(10), day(12));
    expect(result.availableUnits).toBe(0);
    expect(result.unitId).toBeNull();
  });

  it('MAINTENANCE units are out of inventory', async () => {
    const { roomType, units } = await createRoomTypeWithUnits({ units: 2 });
    await prisma.room.update({
      where: { id: units[0].id },
      data: { status: RoomStatus.MAINTENANCE },
    });
    const result = await findAvailability(roomType.id, day(10), day(12));
    expect(result.availableUnits).toBe(1);
    expect(result.unitId).toBe(units[1].id);
    expect(await isUnitFree(units[0].id, day(10), day(12))).toBe(false);
  });

  it('counts only units whose calendars are actually clear', async () => {
    const { roomType, units } = await createRoomTypeWithUnits({ units: 3 });
    await seedBooking(roomType.id, units[0].id, 10, 12, BookingStatus.CONFIRMED);
    await seedBooking(
      roomType.id,
      units[1].id,
      11,
      13,
      BookingStatus.CHECKED_IN,
    );
    const result = await findAvailability(roomType.id, day(10), day(12));
    expect(result.availableUnits).toBe(1);
    expect(result.unitId).toBe(units[2].id);
  });
});
