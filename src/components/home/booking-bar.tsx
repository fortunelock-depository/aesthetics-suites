// src/components/home/booking-bar.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { toDateOnlyString } from '@/lib/hotel/dates';
import { DateField } from '@/components/ui/date-field';

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
  // 16px font so iOS doesn't zoom the page on focus. Shared by the guests
  // select and the two date triggers so all three cells read as one strip.
  const field =
    'w-full min-w-0 bg-transparent text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Check availability"
      className="grid overflow-hidden border border-border bg-card shadow-lg shadow-foreground/5 sm:grid-cols-[1fr_1fr_minmax(7rem,0.8fr)_auto]"
    >
      <div className={cell}>
        <label id="hero-check-in-label" htmlFor="hero-check-in" className={label}>
          Check in
        </label>
        <DateField
          id="hero-check-in"
          aria-labelledby="hero-check-in-label"
          value={checkIn}
          onChange={setCheckIn}
          min={today}
          placeholder="Add date"
          hideIcon
          className={field}
        />
      </div>

      <div className={cell}>
        <label id="hero-check-out-label" htmlFor="hero-check-out" className={label}>
          Check out
        </label>
        <DateField
          id="hero-check-out"
          aria-labelledby="hero-check-out-label"
          value={checkOut}
          onChange={setCheckOut}
          min={checkIn || today}
          placeholder="Add date"
          hideIcon
          className={field}
        />
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
        className="btn-sweep btn-sweep-light inline-flex items-center justify-center gap-2.5 bg-brand px-8 py-4 text-[13px] font-medium tracking-[0.14em] text-brand-foreground uppercase transition-[color,opacity] duration-200 active:opacity-90 sm:px-[43px] sm:py-0"
      >
        Check availability
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
