// src/components/ui/calendar.tsx
'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';

/**
 * The month grid behind every date control. Styled to the house system:
 * square cells, brand tokens, and a clay range whose ends carry the solid
 * fill. react-day-picker owns the keyboard model (arrows move by day,
 * PageUp/PageDown by month, Home/End to the week edges) and announces the
 * focused day, so nothing here re-implements that.
 */
export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays
      className={cn('p-1', className)}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'space-y-3',
        month_caption: 'flex h-8 items-center justify-center',
        caption_label: 'font-heading text-lg font-normal text-foreground',
        nav: 'flex items-center gap-1',
        button_previous:
          'absolute left-1 top-0 grid h-8 w-8 place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40',
        button_next:
          'absolute right-1 top-0 grid h-8 w-8 place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'w-10 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase',
        week: 'mt-1 flex w-full',
        day: 'relative h-10 w-10 p-0 text-center text-sm focus-within:relative focus-within:z-20',
        day_button:
          'h-10 w-10 font-normal text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:text-muted-foreground/50 disabled:line-through',
        selected:
          'bg-brand text-brand-foreground hover:bg-brand [&>button]:text-brand-foreground [&>button:hover]:bg-brand',
        range_start: 'bg-brand text-brand-foreground',
        range_end: 'bg-brand text-brand-foreground',
        range_middle:
          'bg-brand/20 [&>button]:text-foreground [&>button:hover]:bg-brand/30',
        today: 'font-medium underline decoration-brand underline-offset-4',
        outside: 'text-muted-foreground/40',
        disabled: 'text-muted-foreground/40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" {...rest} />
          ) : (
            <ChevronRight className="h-4 w-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
