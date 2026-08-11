// src/lib/hotel/pricing.test.ts
import { describe, expect, it } from 'vitest';
import { parseDateOnly, nightsBetween, rangesOverlap } from './dates';
import {
  computeQuote,
  discountApplies,
  discountAmountFor,
  type IDiscountInput,
} from './pricing';

const d = parseDateOnly;

const baseDiscount: IDiscountInput = {
  id: 'x',
  code: 'SAVE10',
  type: 'PERCENT',
  value: 10,
  startsAt: null,
  endsAt: null,
  minNights: null,
  maxUses: null,
  usedCount: 0,
  isActive: true,
};

describe('dates', () => {
  it('counts nights and detects half-open overlap', () => {
    expect(nightsBetween(d('2026-12-20'), d('2026-12-23'))).toBe(3);
    // Back-to-back stays (one checks out the day the next checks in) do NOT overlap.
    expect(
      rangesOverlap(d('2026-12-20'), d('2026-12-23'), d('2026-12-23'), d('2026-12-25')),
    ).toBe(false);
    expect(
      rangesOverlap(d('2026-12-20'), d('2026-12-23'), d('2026-12-22'), d('2026-12-25')),
    ).toBe(true);
  });
});

describe('computeQuote', () => {
  it('uses base price outside seasons and the season rate inside', () => {
    const quote = computeQuote({
      checkIn: d('2026-12-23'),
      checkOut: d('2026-12-27'),
      basePrice: 50_000,
      baseMinNights: 1,
      seasonRates: [
        {
          // Christmas peak covers the 25th and 26th nights only.
          startDate: d('2026-12-25'),
          endDate: d('2026-12-27'),
          nightlyPrice: 80_000,
          minNights: 2,
        },
      ],
    });

    expect(quote.nights).toBe(4);
    expect(quote.nightlyPrices).toEqual([50_000, 50_000, 80_000, 80_000]);
    expect(quote.baseAmount).toBe(260_000);
    expect(quote.totalAmount).toBe(260_000);
    // The season's stricter minimum applies because the stay touches it.
    expect(quote.minNights).toBe(2);
  });

  it('applies a percent discount and clamps fixed discounts to the base', () => {
    const quote = computeQuote({
      checkIn: d('2026-11-01'),
      checkOut: d('2026-11-03'),
      basePrice: 50_000,
      baseMinNights: 1,
      seasonRates: [],
      discount: baseDiscount,
    });
    expect(quote.discountAmount).toBe(10_000);
    expect(quote.totalAmount).toBe(90_000);

    expect(
      discountAmountFor(30_000, { ...baseDiscount, type: 'FIXED', value: 99_999 }),
    ).toBe(30_000);
  });
});

describe('occupancy surcharge and taxes', () => {
  it('charges extra guests per night and taxes the discounted subtotal', () => {
    const quote = computeQuote({
      checkIn: d('2026-11-01'),
      checkOut: d('2026-11-03'),
      basePrice: 50_000,
      baseMinNights: 1,
      seasonRates: [],
      // 3 guests, 2 included: 1 extra x 5,000/night x 2 nights = 10,000.
      guests: 3,
      baseOccupancy: 2,
      extraGuestFeePerNight: 5_000,
      discount: baseDiscount, // 10% off (base + occupancy) = 11,000
      taxFees: [
        { name: 'VAT', rateBps: 1500 },
        { name: 'Tourism levy', rateBps: 100 },
      ],
    });

    expect(quote.baseAmount).toBe(100_000);
    expect(quote.occupancyAmount).toBe(10_000);
    expect(quote.discountAmount).toBe(11_000);
    // Taxable = 99,000 -> VAT 14,850 + levy 990.
    expect(quote.taxLines).toEqual([
      { name: 'VAT', rateBps: 1500, amount: 14_850 },
      { name: 'Tourism levy', rateBps: 100, amount: 990 },
    ]);
    expect(quote.taxAmount).toBe(15_840);
    expect(quote.totalAmount).toBe(114_840);
  });

  it('adds no surcharge within base occupancy', () => {
    const quote = computeQuote({
      checkIn: d('2026-11-01'),
      checkOut: d('2026-11-02'),
      basePrice: 50_000,
      baseMinNights: 1,
      seasonRates: [],
      guests: 2,
      baseOccupancy: 2,
      extraGuestFeePerNight: 5_000,
    });
    expect(quote.occupancyAmount).toBe(0);
    expect(quote.totalAmount).toBe(50_000);
  });
});

describe('discountApplies', () => {
  const now = d('2026-12-01');

  it('respects active flag, window, minNights and maxUses', () => {
    expect(discountApplies(baseDiscount, { nights: 1, now })).toBe(true);
    expect(
      discountApplies({ ...baseDiscount, isActive: false }, { nights: 1, now }),
    ).toBe(false);
    expect(
      discountApplies(
        { ...baseDiscount, endsAt: d('2026-11-30') },
        { nights: 1, now },
      ),
    ).toBe(false);
    expect(
      discountApplies({ ...baseDiscount, minNights: 3 }, { nights: 2, now }),
    ).toBe(false);
    expect(
      discountApplies(
        { ...baseDiscount, maxUses: 5, usedCount: 5 },
        { nights: 1, now },
      ),
    ).toBe(false);
  });
});
