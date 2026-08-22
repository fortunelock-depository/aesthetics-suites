// Booking creation: the double-seating race (advisory lock + in-tx recheck),
// the DB exclusion-constraint backstop, manual-booking guards, override tax
// identity, actor stamping, code-collision retry, and the schema-level stay
// caps.
import { describe, expect, it, vi } from 'vitest';
import prisma, { BookingStatus, BookingSource } from '@/lib/prisma';
import {
  createWebsiteBooking,
  createManualBooking,
} from '@/lib/hotel/booking-service';
import { recomputeTaxForTotal, type ITaxLine } from '@/lib/hotel/pricing';
import { parseDateOnly } from '@/lib/hotel/dates';
import { generateBookingCode } from '@/utils/codes';
import { bookingCreateSchema } from '@/validations/hotel-validation';
import { ConflictError } from '@/lib/errors';
import { handleApiError } from '@/utils/api-response';
import { createRoomTypeWithUnits, futureDate, guestInput } from './helpers';

const ACTOR = () =>
  prisma.user.create({
    data: {
      email: `staff-${Math.random().toString(16).slice(2)}@test.local`,
      password: 'not-a-real-hash',
      fullname: 'Front Desk',
    },
  });

describe('createWebsiteBooking', () => {
  it('creates a PENDING hold with server-computed money and a checkout URL', async () => {
    const { roomType, units } = await createRoomTypeWithUnits({
      basePrice: 50_000,
    });
    const result = await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(10), futureDate(13)),
    );

    expect(result.booking.status).toBe(BookingStatus.PENDING);
    expect(result.booking.roomId).toBe(units[0].id);
    expect(result.booking.nights).toBe(3);
    expect(result.booking.baseAmount).toBe(150_000);
    expect(result.booking.totalAmount).toBe(150_000);
    expect(result.booking.holdExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    expect(result.authorizationUrl).toContain('https://paystack.test/pay/');

    // The ledger row was written before Paystack learned the reference.
    const payment = await prisma.payment.findFirst({
      where: { purpose: 'BOOKING', purposeId: result.booking.id },
    });
    expect(payment?.amount).toBe(150_000);
    expect(payment?.status).toBe('PENDING');
  });

  it('CRITICAL-1: two concurrent checkouts for the last unit seat exactly one', async () => {
    const { roomType } = await createRoomTypeWithUnits({ units: 1 });
    const input = () =>
      guestInput(roomType.slug, futureDate(10), futureDate(12), {
        guestEmail: `race-${Math.random().toString(16).slice(2)}@test.local`,
      });

    const results = await Promise.allSettled([
      createWebsiteBooking(input()),
      createWebsiteBooking(input()),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(
      (rejected[0] as PromiseRejectedResult).reason,
    ).toBeInstanceOf(ConflictError);

    const bookings = await prisma.booking.count({
      where: { roomTypeId: roomType.id },
    });
    expect(bookings).toBe(1);
  });

  it('the exclusion constraint backstops any write that bypasses the service', async () => {
    const { roomType, units } = await createRoomTypeWithUnits();
    const raw = (checkIn: string, checkOut: string) =>
      prisma.booking.create({
        data: {
          code: generateBookingCode(),
          roomTypeId: roomType.id,
          roomId: units[0].id,
          guestName: 'Raw',
          guestEmail: 'raw@test.local',
          checkIn: parseDateOnly(checkIn),
          checkOut: parseDateOnly(checkOut),
          nights: 2,
          status: BookingStatus.CONFIRMED,
          baseAmount: 1,
          totalAmount: 1,
        },
      });

    await raw(futureDate(10), futureDate(12));
    let caught: unknown;
    try {
      await raw(futureDate(11), futureDate(13));
    } catch (error) {
      caught = error;
    }
    expect(String((caught as Error).message)).toMatch(
      /Booking_no_unit_overlap|23P01|exclusion/,
    );

    // The central error translator turns the violation into a guest 409.
    const response = handleApiError(caught);
    expect(response.status).toBe(409);

    // Back-to-back is allowed by the constraint too (half-open daterange).
    await expect(raw(futureDate(12), futureDate(14))).resolves.toBeTruthy();
  });

  it('retries on a booking-code collision instead of surfacing a 500', async () => {
    const { roomType } = await createRoomTypeWithUnits({ units: 2 });
    const first = await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(10), futureDate(12)),
    );

    // Force the next generated code to collide once, then behave normally.
    vi.mocked(generateBookingCode).mockReturnValueOnce(first.booking.code);

    const second = await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(10), futureDate(12), {
        guestEmail: 'second@test.local',
      }),
    );
    expect(second.booking.code).not.toBe(first.booking.code);
  });

  it('rejects unpublished room types and past check-ins', async () => {
    const { roomType } = await createRoomTypeWithUnits({ isPublished: false });
    await expect(
      createWebsiteBooking(
        guestInput(roomType.slug, futureDate(10), futureDate(12)),
      ),
    ).rejects.toThrow('Room not found');

    const { roomType: live } = await createRoomTypeWithUnits();
    await expect(
      createWebsiteBooking(
        guestInput(live.slug, futureDate(-2), futureDate(2)),
      ),
    ).rejects.toThrow('Check-in cannot be in the past');
  });
});

describe('createManualBooking', () => {
  it('creates CONFIRMED, stamps the acting user, and enforces capacity', async () => {
    const actor = await ACTOR();
    const { roomType, units } = await createRoomTypeWithUnits({
      capacityAdults: 2,
      capacityChildren: 1,
    });

    const booking = await createManualBooking(
      {
        roomTypeId: roomType.id,
        checkIn: futureDate(5),
        checkOut: futureDate(7),
        adults: 2,
        children: 0,
        guestName: 'Walk In',
        guestEmail: 'walkin@test.local',
      },
      actor.id,
    );
    expect(booking.status).toBe(BookingStatus.CONFIRMED);
    expect(booking.source).toBe(BookingSource.MANUAL);
    expect(booking.roomId).toBe(units[0].id);
    expect(booking.createdById).toBe(actor.id);

    await expect(
      createManualBooking(
        {
          roomTypeId: roomType.id,
          checkIn: futureDate(20),
          checkOut: futureDate(22),
          adults: 3,
          children: 0,
          guestName: 'Too Many',
          guestEmail: 'many@test.local',
        },
        actor.id,
      ),
    ).rejects.toThrow(/sleeps up to/);
  });

  it('enforces minNights and past-date rules like the public path', async () => {
    const actor = await ACTOR();
    const { roomType } = await createRoomTypeWithUnits({ minNights: 3 });
    const base = {
      roomTypeId: roomType.id,
      adults: 1,
      children: 0,
      guestName: 'Short Stay',
      guestEmail: 'short@test.local',
    };

    await expect(
      createManualBooking(
        { ...base, checkIn: futureDate(5), checkOut: futureDate(6) },
        actor.id,
      ),
    ).rejects.toThrow(/minimum of 3 night/);

    await expect(
      createManualBooking(
        { ...base, checkIn: futureDate(-1), checkOut: futureDate(3) },
        actor.id,
      ),
    ).rejects.toThrow(/in the past/);
  });

  it('totalOverride re-derives the tax lines from the money actually collected', async () => {
    const actor = await ACTOR();
    await prisma.taxFee.create({
      data: { name: 'VAT', rateBps: 1500, isActive: true },
    });
    const { roomType } = await createRoomTypeWithUnits({ basePrice: 100_000 });

    const override = 80_000;
    const booking = await createManualBooking(
      {
        roomTypeId: roomType.id,
        checkIn: futureDate(5),
        checkOut: futureDate(6),
        adults: 1,
        children: 0,
        guestName: 'Negotiated',
        guestEmail: 'deal@test.local',
        totalOverride: override,
      },
      actor.id,
    );

    expect(booking.totalAmount).toBe(override);
    const expected = recomputeTaxForTotal(override, [
      { name: 'VAT', rateBps: 1500 },
    ]);
    expect(booking.taxAmount).toBe(expected.taxAmount);
    const lines = booking.taxBreakdown as unknown as ITaxLine[];
    expect(lines.reduce((sum, line) => sum + line.amount, 0)).toBe(
      expected.taxAmount,
    );

    // The stored breakdown still adds up to what was charged: the
    // negotiated difference lives in discountAmount.
    expect(
      booking.baseAmount +
        booking.occupancyAmount -
        booking.discountAmount +
        booking.taxAmount,
    ).toBe(booking.totalAmount);
  });

  it('refuses an override ABOVE the quote (a discount, never a surcharge)', async () => {
    const actor = await ACTOR();
    const { roomType } = await createRoomTypeWithUnits({ basePrice: 100_000 });

    // discountAmount clamps at zero, so a surcharge cannot be represented
    // in the stored breakdown - the service rejects it instead of storing
    // components that disagree with totalAmount.
    await expect(
      createManualBooking(
        {
          roomTypeId: roomType.id,
          checkIn: futureDate(5),
          checkOut: futureDate(6),
          adults: 1,
          children: 0,
          guestName: 'Surcharge',
          guestEmail: 'surcharge@test.local',
          totalOverride: 500_000,
        },
        actor.id,
      ),
    ).rejects.toThrow(/cannot exceed the quoted total/);

    expect(await prisma.booking.count()).toBe(0);
  });

  it('refuses a specific unit that is not free', async () => {
    const actor = await ACTOR();
    const { roomType, units } = await createRoomTypeWithUnits();
    await createManualBooking(
      {
        roomTypeId: roomType.id,
        roomId: units[0].id,
        checkIn: futureDate(5),
        checkOut: futureDate(8),
        adults: 1,
        children: 0,
        guestName: 'First',
        guestEmail: 'first@test.local',
      },
      actor.id,
    );
    await expect(
      createManualBooking(
        {
          roomTypeId: roomType.id,
          roomId: units[0].id,
          checkIn: futureDate(6),
          checkOut: futureDate(9),
          adults: 1,
          children: 0,
          guestName: 'Second',
          guestEmail: 'seconds@test.local',
        },
        actor.id,
      ),
    ).rejects.toThrow(/not free/);
  });
});

describe('stay-cap and date validation (bookingCreateSchema)', () => {
  const valid = {
    roomTypeSlug: 'any',
    guestName: 'Guest Name',
    guestEmail: 'g@test.local',
    adults: 1,
    children: 0,
  };

  it('rejects stays over 90 nights and check-ins beyond 24 months', () => {
    const tooLong = bookingCreateSchema.safeParse({
      ...valid,
      checkIn: futureDate(10),
      checkOut: futureDate(10 + 91),
    });
    expect(tooLong.success).toBe(false);

    const tooFar = bookingCreateSchema.safeParse({
      ...valid,
      checkIn: futureDate(366 * 2 + 40),
      checkOut: futureDate(366 * 2 + 42),
    });
    expect(tooFar.success).toBe(false);

    const fine = bookingCreateSchema.safeParse({
      ...valid,
      checkIn: futureDate(10),
      checkOut: futureDate(12),
    });
    expect(fine.success).toBe(true);
  });

  it('rejects rollover and impossible calendar dates', () => {
    for (const checkIn of ['2027-02-31', '2027-13-01', '2027-00-10']) {
      const result = bookingCreateSchema.safeParse({
        ...valid,
        checkIn,
        checkOut: '2027-03-05',
      });
      expect(result.success).toBe(false);
    }
  });
});
