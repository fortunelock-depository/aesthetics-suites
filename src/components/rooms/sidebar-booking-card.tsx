// src/components/rooms/sidebar-booking-card.tsx
'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { toDateOnlyString } from '@/lib/hotel/dates';

/**
 * The sidebar's Booking Now widget (template style: stacked bordered
 * fields + gold CHECK). Until the availability flow lands it hands off to
 * the list itself: submit scrolls to the top of the room list.
 */
export function SidebarBookingCard({ onDone }: { onDone?: () => void } = {}) {
  const today = toDateOnlyString(new Date());
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onDone?.();
    document
      .getElementById('room-list')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const field =
    'w-full min-w-0 border border-border bg-card px-4 py-3.5 text-base text-foreground outline-none transition-colors focus:border-brand';

  return (
    <form onSubmit={handleSubmit} aria-label="Check availability" className="space-y-4">
      <div>
        <label
          htmlFor="sidebar-check-in"
          className="mb-1.5 block text-sm font-medium text-muted-foreground"
        >
          Check In
        </label>
        <input
          id="sidebar-check-in"
          type="date"
          min={today}
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className={field}
        />
      </div>

      <div>
        <label
          htmlFor="sidebar-check-out"
          className="mb-1.5 block text-sm font-medium text-muted-foreground"
        >
          Check Out
        </label>
        <input
          id="sidebar-check-out"
          type="date"
          min={checkIn || today}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className={field}
        />
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
          className={field}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'Guest' : 'Guests'}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="btn-sweep btn-sweep-light inline-flex items-center gap-2.5 bg-brand px-[43px] py-4 font-heading text-base font-bold text-brand-foreground uppercase"
      >
        Check
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
