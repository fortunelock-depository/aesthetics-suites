// src/lib/status-colors.ts
//
// One source of truth for status -> tone styling across tables, cards and
// detail views. Add new enum values here, never inline per page.

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  danger: 'bg-destructive/15 text-destructive',
  neutral: 'border border-border text-muted-foreground',
  info: 'bg-brand/15 text-brand',
};

/** Payment statuses (Prisma PaymentStatus). */
export const PAYMENT_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
  REVERSED: 'neutral',
};
