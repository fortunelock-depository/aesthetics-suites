// src/components/rooms/room-sticky-cta.tsx
'use client';

import * as React from 'react';
import { StayCtaLink } from '@/components/rooms/stay-link';
import { ROOM_BOOK_STRIP_ID } from '@/components/rooms/room-price-widget';
import { formatRate } from '@/lib/format-money';
import { bookRoom } from '@/lib/routes';

/**
 * Below lg the rate and Book now live in a strip at the top of the room
 * detail page, which the guest leaves behind the moment they reach the
 * gallery, FAQs or reviews. This bar takes over from there: it appears
 * only once that strip has scrolled off the TOP of the viewport (so it
 * never doubles up with it, and never shows before the page has moved)
 * and carries the same rate and action to the thumb.
 */
export function RoomStickyCta({
  slug,
  basePrice,
  currency,
}: {
  slug: string;
  /** Nightly rate in minor units. */
  basePrice: number;
  currency: string;
}) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const strip = document.getElementById(ROOM_BOOK_STRIP_ID);
    // No strip (or no observer) means no bar: never guess at scroll state.
    if (!strip || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only when the strip has passed ABOVE the fold - a strip still
        // below the viewport is one the guest has not reached yet.
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observer.observe(strip);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Holds the end of the page clear of the bar, so nothing is left
          stranded underneath it at the bottom of the scroll. */}
      <div aria-hidden className="h-20 lg:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_var(--scrim)] animate-in slide-in-from-bottom-8 duration-300 motion-reduce:animate-none lg:hidden">
        <p className="min-w-0">
          <span className="font-heading text-[22px] leading-none font-light tracking-[-0.01em] text-foreground">
            {formatRate(basePrice, currency)}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            per night
          </span>
        </p>
        <StayCtaLink href={bookRoom(slug)} className="flex-none px-6 py-3.5">
          Book now
        </StayCtaLink>
      </div>
    </>
  );
}
