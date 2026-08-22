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
  success: 'bg-secondary text-foreground dark:bg-secondary/40',
  warning: 'bg-peach text-brand-text dark:bg-brand/20 dark:text-brand-text',
  danger: 'bg-destructive/15 text-destructive',
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
