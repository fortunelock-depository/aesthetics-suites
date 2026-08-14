// Season-rate integrity and discount redemption against the real database:
// overlap rejection, the latest-created-wins ordering actually reaching a
// quote, and the guarded maxUses increment staying capped under double
// settlement.
import { describe, expect, it } from 'vitest';
import prisma, { DiscountType } from '@/lib/prisma';
import { quoteStay, createWebsiteBooking } from '@/lib/hotel/booking-service';
import { confirmPayment } from '@/lib/payments/payment-service';
import { assertNoSeasonOverlap } from '@/lib/hotel/season-rates';
import { parseDateOnly } from '@/lib/hotel/dates';
import { createRoomTypeWithUnits, futureDate, guestInput } from './helpers';

describe('assertNoSeasonOverlap', () => {
  it('rejects overlapping ranges and allows back-to-back seasons', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    await prisma.seasonRate.create({
      data: {
        roomTypeId: roomType.id,
        name: 'Peak',
        startDate: parseDateOnly(futureDate(10)),
        endDate: parseDateOnly(futureDate(20)),
        nightlyPrice: 150_000,
      },
    });

    await expect(
      assertNoSeasonOverlap(
        roomType.id,
        parseDateOnly(futureDate(15)),
        parseDateOnly(futureDate(25)),
      ),
    ).rejects.toThrow(/overlaps the existing season "Peak"/);

    // Half-open: a season may start the day the previous one ends.
    await expect(
      assertNoSeasonOverlap(
        roomType.id,
        parseDateOnly(futureDate(20)),
        parseDateOnly(futureDate(30)),
      ),
    ).resolves.toBeUndefined();
  });

  it('excludes the rate being updated from its own overlap check', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const rate = await prisma.seasonRate.create({
      data: {
        roomTypeId: roomType.id,
        name: 'Festive',
        startDate: parseDateOnly(futureDate(10)),
        endDate: parseDateOnly(futureDate(20)),
        nightlyPrice: 150_000,
      },
    });
    // Shifting its own end date must not clash with itself.
    await expect(
      assertNoSeasonOverlap(
        roomType.id,
        parseDateOnly(futureDate(10)),
        parseDateOnly(futureDate(22)),
        rate.id,
      ),
    ).resolves.toBeUndefined();
  });
});

describe('season-rate ordering in quotes', () => {
  it('the latest-created rate wins where ranges overlap (documented rule)', async () => {
    const { roomType } = await createRoomTypeWithUnits({ basePrice: 100_000 });
    // Overlaps are rejected for NEW rates, but pre-existing overlapping data
    // must still price deterministically - seed both directly.
    await prisma.seasonRate.create({
      data: {
        roomTypeId: roomType.id,
        name: 'Older',
        startDate: parseDateOnly(futureDate(10)),
        endDate: parseDateOnly(futureDate(14)),
        nightlyPrice: 80_000,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    });
    await prisma.seasonRate.create({
      data: {
        roomTypeId: roomType.id,
        name: 'Newer',
        startDate: parseDateOnly(futureDate(10)),
        endDate: parseDateOnly(futureDate(14)),
        nightlyPrice: 120_000,
        createdAt: new Date('2026-06-01T00:00:00Z'),
      },
    });

    const { quote } = await quoteStay({
      roomTypeSlug: roomType.slug,
      checkIn: futureDate(10),
      checkOut: futureDate(12),
      adults: 1,
      children: 0,
    });
    expect(quote.nightlyPrices).toEqual([120_000, 120_000]);
    expect(quote.baseAmount).toBe(240_000);
  });

  it('a season boundary mid-stay prices each night by its own rate', async () => {
    const { roomType } = await createRoomTypeWithUnits({ basePrice: 100_000 });
    await prisma.seasonRate.create({
      data: {
        roomTypeId: roomType.id,
        name: 'Peak',
        startDate: parseDateOnly(futureDate(11)),
        endDate: parseDateOnly(futureDate(20)),
        nightlyPrice: 200_000,
      },
    });
    const { quote } = await quoteStay({
      roomTypeSlug: roomType.slug,
      checkIn: futureDate(10),
      checkOut: futureDate(12),
      adults: 1,
      children: 0,
    });
    // Night 1 at base, night 2 in season.
    expect(quote.nightlyPrices).toEqual([100_000, 200_000]);
  });
});

describe('discount redemption', () => {
  it('caps usedCount at maxUses even when two bookings settle with the code', async () => {
    const { roomType } = await createRoomTypeWithUnits({ units: 2 });
    const discount = await prisma.discount.create({
      data: {
        code: 'ONEUSE',
        name: 'Single use',
        type: DiscountType.FIXED,
        value: 10_000,
        maxUses: 1,
        isActive: true,
      },
    });

    // Both quotes pass while usedCount is still 0 (accepted soft check);
    // the guarded increment is what must hold the line.
    const first = await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(10), futureDate(12), {
        discountCode: 'ONEUSE',
        guestEmail: 'one@test.local',
      }),
    );
    const second = await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(10), futureDate(12), {
        discountCode: 'ONEUSE',
        guestEmail: 'two@test.local',
      }),
    );

    for (const booking of [first.booking, second.booking]) {
      const payment = await prisma.payment.findFirstOrThrow({
        where: { purpose: 'BOOKING', purposeId: booking.id },
      });
      await confirmPayment(payment.reference);
    }

    const spent = await prisma.discount.findUniqueOrThrow({
      where: { id: discount.id },
    });
    expect(spent.usedCount).toBe(1);
  });

  it('applies a valid promo code to the quote and denormalizes it', async () => {
    const { roomType } = await createRoomTypeWithUnits({ basePrice: 100_000 });
    await prisma.discount.create({
      data: {
        code: 'SAVE10',
        name: 'Ten percent',
        type: DiscountType.PERCENT,
        value: 10,
        isActive: true,
      },
    });
    const result = await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(10), futureDate(12), {
        discountCode: 'SAVE10',
      }),
    );
    expect(result.booking.discountAmount).toBe(20_000);
    expect(result.booking.totalAmount).toBe(180_000);
    expect(result.booking.discountCode).toBe('SAVE10');
  });

  it('rejects an invalid promo code', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    await expect(
      quoteStay({
        roomTypeSlug: roomType.slug,
        checkIn: futureDate(10),
        checkOut: futureDate(12),
        adults: 1,
        children: 0,
        discountCode: 'NOPE',
      }),
    ).rejects.toThrow(/not valid for this stay/);
  });
});
