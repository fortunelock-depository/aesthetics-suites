// src/lib/format-money.ts
//
// Money helpers. Amounts are stored in MINOR units (pesewas) end-to-end;
// these are the only places that convert for display.

const GHS = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
  minimumFractionDigits: 2,
});

/** "GH₵1,234.50" from minor units. */
export const formatMoney = (minorUnits: number, currency = 'GHS'): string => {
  if (currency === 'GHS') return GHS.format(minorUnits / 100);
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
  }).format(minorUnits / 100);
};

/**
 * Nightly rate for display: "GH₵1,200" rather than "GH₵1,200.00". A whole
 * amount drops its cents, since trailing zeroes on a headline price read as
 * an invoice; an amount with pesewas keeps them so the figure stays exact.
 * Itemised quotes and receipts still use formatMoney.
 */
export const formatRate = (minorUnits: number, currency = 'GHS'): string => {
  const whole = minorUnits % 100 === 0;
  if (!whole) return formatMoney(minorUnits, currency);
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
};

/**
 * Compact form for cards/tiles at scale ("GH₵24.5M") - the exact figure
 * belongs in a `title` tooltip and on the detail view.
 */
export const formatMoneyCompact = (
  minorUnits: number,
  currency = 'GHS',
): string => {
  const major = minorUnits / 100;
  if (Math.abs(major) < 1_000_000) return formatMoney(minorUnits, currency);
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(major);
};
