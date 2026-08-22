// src/lib/status-colors.ts
//
// One source of truth for status -> tone styling across tables, cards and
// detail views. Add new enum values here, never inline per page.

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  // Tones are mixed from the brand palette rather than Tailwind's emerald and
  // amber, which are the only cool hues that ever appeared on an olive and
  // clay page. `info` takes --brand-text, not the clay fill: the fill sits at
  // roughly 2:1 on cream and fails AA on the badge a confirmed guest sees.
  //
  // `warning` and `danger` carry the tone in the FILL and take --foreground
  // for the ink, the way `success` already does. Their previous tinted inks
  // could not reach AA at badge size: --destructive tops out near 4.0:1 even
  // on plain cream, so red-on-red-tint measured 3.5:1 in light and 3.9:1 on
  // a hovered dark row. Fill and ink were raised together.
  success: 'bg-secondary text-foreground dark:bg-secondary/40',
  warning: 'bg-peach text-brand-text dark:bg-brand/25 dark:text-foreground',
  danger: 'bg-destructive/15 text-foreground dark:bg-destructive/25',
  neutral: 'border border-border text-muted-foreground',
  info: 'bg-brand/15 text-brand-text',
};

/** Payment statuses (Prisma PaymentStatus). */
export const PAYMENT_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
  REVERSED: 'neutral',
};
