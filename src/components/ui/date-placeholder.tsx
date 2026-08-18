// src/components/ui/date-placeholder.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Gives an `<input type="date">` a real placeholder. Browsers do not honour
 * `placeholder` on date inputs: desktop Chrome shows its own dd/mm/yyyy
 * mask, and iOS/Android render an EMPTY box, so a phone user sees a dead
 * field with nothing to say what it wants. Wrap the input and pass the
 * controlled `value`; while it is empty a hint sits over the field (and the
 * browser's own mask is made transparent so the two never overlap), and the
 * hint steps aside the moment the field is focused or filled.
 *
 * Pure CSS on the wrapper - no cloning, no extra state - so it works with
 * any styled input. `pad` must mirror the input's horizontal padding so the
 * hint lines up with where typed text would sit.
 */
export function DatePlaceholder({
  value,
  placeholder = 'Select date',
  pad = 'px-4',
  hintClassName = 'text-base',
  className,
  children,
}: {
  /** The input's controlled value ('' = empty, hint shown). */
  value: string;
  placeholder?: string;
  /** Horizontal padding classes matching the wrapped input. */
  pad?: string;
  /** Font-size classes matching the wrapped input's text. */
  hintClassName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const empty = value === '';
  return (
    <span
      data-empty={empty || undefined}
      className={cn(
        'relative block min-w-0',
        // Hide the browser's own dd/mm/yyyy mask while empty and unfocused,
        // so only our hint shows; typing (focus) brings the mask back.
        '[&[data-empty]>input:not(:focus)]:text-transparent',
        // The hint disappears as soon as the field is being edited.
        '[&:has(>input:focus)>[data-hint]]:hidden',
        // iOS centres date text by default; keep it left like other fields.
        '[&>input::-webkit-date-and-time-value]:text-left',
        className,
      )}
    >
      {children}
      {empty && (
        <span
          data-hint
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 flex items-center text-muted-foreground',
            pad,
            hintClassName,
          )}
        >
          {placeholder}
        </span>
      )}
    </span>
  );
}
