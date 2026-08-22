// src/components/ui/date-field.tsx
'use client';

import * as React from 'react';
import { CalendarDays } from 'lucide-react';

import { Calendar } from '@/components/ui/calendar';
import type { Matcher } from 'react-day-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDate } from '@/lib/format-date';
import { isValidDateOnly, parseDateOnly, toDateOnlyString } from '@/lib/hotel/dates';
import { cn } from '@/lib/utils';

/**
 * A date control that speaks the same contract the native input did: the
 * value in and out is a `YYYY-MM-DD` string, empty when unset, and `min`/`max`
 * are the same date-only strings. Swapping one for the other therefore does
 * not touch the surrounding form state or validation.
 *
 * The trigger is a real button, so it takes focus and opens on Enter or
 * Space; the panel is a Radix popover, which moves focus into the month grid,
 * traps it while open, restores it on close and closes on Escape. The grid
 * itself is react-day-picker, which owns the arrow-key model and announces
 * the focused day.
 */
export interface DateFieldProps {
  id?: string;
  /** `YYYY-MM-DD`, or empty for no date. */
  value: string;
  onChange: (value: string) => void;
  /** Shown on the trigger while no date is set. */
  placeholder?: string;
  /** Earliest selectable date, `YYYY-MM-DD`. */
  min?: string;
  /** Latest selectable date, `YYYY-MM-DD`. */
  max?: string;
  disabled?: boolean;
  className?: string;
  /** Class for the trigger's label text, so a caller can match its field. */
  labelClassName?: string;
  /** Wired to the field's error text by the caller. */
  'aria-describedby'?: string;
  /** Id of the visible label, so the trigger is named by it. */
  'aria-labelledby'?: string;
  'aria-label'?: string;
  /**
   * Styling hook for the invalid state. The trigger is a button, a role that
   * does not support aria-invalid, so invalidity reaches assistive tech
   * through the error text linked by aria-describedby instead.
   */
  invalid?: boolean;
  /** Hide the leading calendar icon where the caller draws its own. */
  hideIcon?: boolean;
  name?: string;
}

const toDate = (value: string): Date | undefined =>
  value && isValidDateOnly(value) ? parseDateOnly(value) : undefined;

export function DateField({
  id,
  value,
  onChange,
  placeholder = 'Add date',
  min,
  max,
  disabled,
  className,
  labelClassName,
  hideIcon = false,
  name,
  invalid,
  ...aria
}: DateFieldProps) {
  const [open, setOpen] = React.useState(false);
  const selected = toDate(value);
  const minDate = toDate(min ?? '');
  const maxDate = toDate(max ?? '');

  // react-day-picker matchers, built only from the bounds actually given.
  const disabledMatchers: Matcher[] = [];
  if (minDate) disabledMatchers.push({ before: minDate });
  if (maxDate) disabledMatchers.push({ after: maxDate });

  return (
    <>
      {/* The chosen date still reaches a plain form post, and native
          validation, exactly as the input it replaced did. */}
      {name && <input type="hidden" name={name} value={value} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            data-invalid={invalid ? 'true' : undefined}
            aria-describedby={aria['aria-describedby']}
            aria-labelledby={aria['aria-labelledby']}
            aria-label={aria['aria-label']}
            className={cn(
              'flex w-full min-w-0 items-center gap-2 text-left text-base text-foreground outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-not-allowed disabled:opacity-60',
              className,
            )}
          >
            {!hideIcon && (
              <CalendarDays
                className="h-4 w-4 flex-none text-brand"
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                'min-w-0 truncate',
                !selected && 'text-muted-foreground',
                labelClassName,
              )}
            >
              {selected ? formatDate(selected) : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="single"
            autoFocus
            selected={selected}
            defaultMonth={selected ?? minDate}
            startMonth={minDate}
            endMonth={maxDate}
            disabled={disabledMatchers}
            onSelect={(date) => {
              onChange(date ? toDateOnlyString(date) : '');
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
