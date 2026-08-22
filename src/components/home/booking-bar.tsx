// src/components/home/booking-bar.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { toDateOnlyString } from '@/lib/hotel/dates';
import { DatePlaceholder } from '@/components/ui/date-placeholder';

/**
 * The hero's check-in / check-out / guests bar: flat joined cells, light.
 * Submit hands the chosen stay to the rooms list as URL
 * params; every room link there carries them onward (StayLink) so the
 * checkout arrives prefilled - dates typed here are never typed again.
 * Cells stack full-width on phones; labels sit ABOVE values (never beside).
 */
export function BookingBar() {
  const router = useRouter();
  const today = toDateOnlyString(new Date());
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    params.set('adults', guests);
    const suffix = params.toString();
    router.push(`/rooms${suffix ? `?${suffix}` : ''}#room-list`);
  };

  const cell =
    'flex flex-col gap-1 border-b border-border px-5 py-4 sm:border-r sm:border-b-0 sm:py-5';
  const label =
    'text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase';
  // 16px font so iOS doesn't zoom the page on focus.
  const field =
    'w-full min-w-0 bg-transparent text-base text-foreground outline-none';

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Check availability"
      className="grid overflow-hidden border border-border bg-card shadow-lg shadow-foreground/5 sm:grid-cols-[1fr_1fr_minmax(7rem,0.8fr)_auto]"
    >
      <div className={cell}>
        <label htmlFor="hero-check-in" className={label}>
          Check In
        </label>
        <DatePlaceholder value={checkIn} placeholder="Add date" pad="px-0">
          <input
            id="hero-check-in"
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className={field}
          />
        </DatePlaceholder>
      </div>

      <div className={cell}>
        <label htmlFor="hero-check-out" className={label}>
          Check Out
        </label>
        <DatePlaceholder value={checkOut} placeholder="Add date" pad="px-0">
          <input
            id="hero-check-out"
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className={field}
          />
        </DatePlaceholder>
      </div>

      <div className={cell}>
        <label htmlFor="hero-guests" className={label}>
          Guests
        </label>
        <select
          id="hero-guests"
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
        className="btn-sweep btn-sweep-light inline-flex items-center justify-center gap-2.5 bg-brand px-8 py-4 font-heading text-base font-bold text-brand-foreground uppercase sm:px-[43px] sm:py-0"
      >
        Check Now
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
