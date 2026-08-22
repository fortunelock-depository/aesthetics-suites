// src/components/rooms/sidebar-booking-card.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toDateOnlyString } from '@/lib/hotel/dates';
import { DatePlaceholder } from '@/components/ui/date-placeholder';
import { CTA_BUTTON, FIELD } from './field-styles';

/**
 * The sidebar's availability widget: stacked fields + the clay submit.
 * With a `bookPath` (the room detail page passes its own /book route)
 * submit goes straight to the checkout, dates prefilled;
 * without one (the rooms list) it stamps the stay onto the URL and scrolls
 * to the list, whose StayLinks carry the params onward.
 */
export function SidebarBookingCard({
  bookPath,
  onDone,
}: { bookPath?: string; onDone?: () => void } = {}) {
  const router = useRouter();
  const today = toDateOnlyString(new Date());
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onDone?.();
    const params = new URLSearchParams();
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    params.set('adults', guests);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    if (bookPath) {
      router.push(`${bookPath}${suffix}`);
      return;
    }
    router.push(`/rooms${suffix}#room-list`, { scroll: false });
    document
      .getElementById('room-list')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Check availability" className="space-y-4">
      <div>
        <label
          htmlFor="sidebar-check-in"
          className="mb-1.5 block text-sm font-medium text-muted-foreground"
        >
          Check in
        </label>
        <DatePlaceholder value={checkIn} placeholder="Add check-in date">
          <input
            id="sidebar-check-in"
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className={FIELD}
          />
        </DatePlaceholder>
      </div>

      <div>
        <label
          htmlFor="sidebar-check-out"
          className="mb-1.5 block text-sm font-medium text-muted-foreground"
        >
          Check out
        </label>
        <DatePlaceholder value={checkOut} placeholder="Add check-out date">
          <input
            id="sidebar-check-out"
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className={FIELD}
          />
        </DatePlaceholder>
      </div>

      <div>
        <label
          htmlFor="sidebar-guests"
          className="mb-1.5 block text-sm font-medium text-muted-foreground"
        >
          Guests
        </label>
        <select
          id="sidebar-guests"
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          className={FIELD}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'guest' : 'guests'}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className={cn(
          CTA_BUTTON,
          'btn-sweep-light w-full bg-brand text-brand-foreground',
        )}
      >
        Check availability
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
