// src/lib/hotel/pricing.ts
//
// Pure pricing math - no Prisma, fully unit-testable. All amounts are
// integer minor units (pesewas). The nightly price for a date is the season
// rate covering it, else the base price; on overlapping seasons the FIRST
// match in array order wins, so callers must pass rates ordered
// createdAt-descending (latest-created wins) - the booking service does.
// Discounts apply to the summed base amount.

import { eachNight, nightsBetween, rangesOverlap } from './dates';

export interface ISeasonRateInput {
  startDate: Date;
  endDate: Date;
  nightlyPrice: number;
  minNights: number | null;
}

export interface IDiscountInput {
  id: string;
  code: string | null;
  type: 'PERCENT' | 'FIXED';
  value: number;
  startsAt: Date | null;
  endsAt: Date | null;
  minNights: number | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
}

export interface ITaxFeeInput {
  name: string;
  /** Basis points, e.g. 1500 = 15%. */
  rateBps: number;
}

export interface ITaxLine extends ITaxFeeInput {
  amount: number;
}

export interface IQuote {
  nights: number;
  /** Per-night breakdown, minor units. */
  nightlyPrices: number[];
  baseAmount: number;
  /** Extra-guest surcharge for the whole stay. */
  occupancyAmount: number;
  discountAmount: number;
  /** Itemized taxes on (base + occupancy - discount). */
  taxLines: ITaxLine[];
  taxAmount: number;
  totalAmount: number;
  /** The strictest minimum stay across base + covering seasons. */
  minNights: number;
}

/**
 * Re-derives the tax portion of an OVERRIDDEN total (negotiated walk-in
 * price) so the frozen taxBreakdown matches the money actually collected:
 * the override is tax-inclusive, the taxable base is backed out of it, and
 * rounding drift lands on the last line so the lines always sum to
 * taxAmount exactly (VAT reporting adds these lines up).
 */
export const recomputeTaxForTotal = (
  totalAmount: number,
  taxFees: ITaxFeeInput[],
): { taxableAmount: number; taxAmount: number; taxLines: ITaxLine[] } => {
  const totalBps = taxFees.reduce((sum, fee) => sum + fee.rateBps, 0);
  if (totalBps === 0 || totalAmount <= 0) {
    return {
      taxableAmount: Math.max(totalAmount, 0),
      taxAmount: 0,
      taxLines: taxFees.map((fee) => ({ ...fee, amount: 0 })),
    };
  }
  const taxableAmount = Math.round(
    (totalAmount * 10_000) / (10_000 + totalBps),
  );
  const taxAmount = totalAmount - taxableAmount;
  const taxLines: ITaxLine[] = taxFees.map((fee) => ({
    ...fee,
    amount: Math.round((taxableAmount * fee.rateBps) / 10_000),
  }));
  const drift =
    taxAmount - taxLines.reduce((sum, line) => sum + line.amount, 0);
  if (taxLines.length > 0) {
    taxLines[taxLines.length - 1].amount += drift;
  }
  return { taxableAmount, taxAmount, taxLines };
};

/** The nightly price for one date. */
export const nightlyPriceFor = (
  night: Date,
  basePrice: number,
  seasonRates: ISeasonRateInput[],
): number => {
  for (const rate of seasonRates) {
    if (night >= rate.startDate && night < rate.endDate) {
      return rate.nightlyPrice;
    }
  }
  return basePrice;
};

/** True when the discount is usable for this stay right now. */
export const discountApplies = (
  discount: IDiscountInput,
  stay: { nights: number; now: Date },
): boolean => {
  if (!discount.isActive) return false;
  if (discount.startsAt && stay.now < discount.startsAt) return false;
  if (discount.endsAt && stay.now > discount.endsAt) return false;
  if (discount.minNights && stay.nights < discount.minNights) return false;
  if (
    discount.maxUses !== null &&
    discount.maxUses !== undefined &&
    discount.usedCount >= discount.maxUses
  ) {
    return false;
  }
  return true;
};

/** The discount amount for a base total, clamped to never go negative. */
export const discountAmountFor = (
  baseAmount: number,
  discount: IDiscountInput,
): number => {
  const raw =
    discount.type === 'PERCENT'
      ? Math.round((baseAmount * discount.value) / 100)
      : discount.value;
  return Math.max(0, Math.min(raw, baseAmount));
};

export const computeQuote = ({
  checkIn,
  checkOut,
  basePrice,
  baseMinNights,
  seasonRates,
  discount,
  guests = 0,
  baseOccupancy = Number.POSITIVE_INFINITY,
  extraGuestFeePerNight = 0,
  taxFees = [],
  now = new Date(),
}: {
  checkIn: Date;
  checkOut: Date;
  basePrice: number;
  baseMinNights: number;
  seasonRates: ISeasonRateInput[];
  discount?: IDiscountInput | null;
  /** Total guests (adults + children) for the occupancy surcharge. */
  guests?: number;
  baseOccupancy?: number;
  extraGuestFeePerNight?: number;
  taxFees?: ITaxFeeInput[];
  now?: Date;
}): IQuote => {
  const nights = nightsBetween(checkIn, checkOut);
  const nightlyPrices = eachNight(checkIn, checkOut).map((night) =>
    nightlyPriceFor(night, basePrice, seasonRates),
  );
  const baseAmount = nightlyPrices.reduce((sum, price) => sum + price, 0);

  // A season's stricter minimum applies when the stay touches it.
  let minNights = baseMinNights;
  for (const rate of seasonRates) {
    if (
      rate.minNights &&
      rangesOverlap(checkIn, checkOut, rate.startDate, rate.endDate)
    ) {
      minNights = Math.max(minNights, rate.minNights);
    }
  }

  const extraGuests = Math.max(0, guests - baseOccupancy);
  const occupancyAmount = Number.isFinite(baseOccupancy)
    ? extraGuests * extraGuestFeePerNight * nights
    : 0;

  const applicable =
    discount && discountApplies(discount, { nights, now }) ? discount : null;
  // Discounts apply to room + occupancy charges (never to taxes).
  const discountAmount = applicable
    ? discountAmountFor(baseAmount + occupancyAmount, applicable)
    : 0;

  const taxable = baseAmount + occupancyAmount - discountAmount;
  const taxLines: ITaxLine[] = taxFees.map((fee) => ({
    ...fee,
    amount: Math.round((taxable * fee.rateBps) / 10_000),
  }));
  const taxAmount = taxLines.reduce((sum, line) => sum + line.amount, 0);

  return {
    nights,
    nightlyPrices,
    baseAmount,
    occupancyAmount,
    discountAmount,
    taxLines,
    taxAmount,
    totalAmount: taxable + taxAmount,
    minNights,
  };
};
