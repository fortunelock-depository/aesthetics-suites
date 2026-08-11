// src/components/ui/status-badge.tsx
import { cn } from '@/lib/utils';
import {
  STATUS_TONE_CLASSES,
  type StatusTone,
} from '@/lib/status-colors';

/**
 * Enum-value badge with the shared tone palette. ONLY for short
 * system-generated values (statuses, roles) - never user-authored text.
 */
export function StatusBadge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        STATUS_TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
