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
