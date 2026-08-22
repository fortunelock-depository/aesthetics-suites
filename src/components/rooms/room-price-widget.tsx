// src/components/rooms/room-price-widget.tsx
import { Ruler, Users } from 'lucide-react';
import { StayCtaLink } from '@/components/rooms/stay-link';
import { EYEBROW } from '@/components/site/section-heading';
import { formatRate } from '@/lib/format-money';
import type { IPublicRoomDetail } from '@/lib/hotel/public-room-detail';
import { bookRoom } from '@/lib/routes';

/** The sticky phone bar watches this strip; both live on the detail page. */
export const ROOM_BOOK_STRIP_ID = 'room-book-strip';

/**
 * The detail sidebar's rate widget: capacity rows, the nightly rate, and
 * the clay Book now into the checkout flow.
 */
export function RoomPriceWidget({ room }: { room: IPublicRoomDetail }) {
  const guests = room.capacityAdults + room.capacityChildren;

  return (
    <div>
      <ul className="space-y-2.5 text-[15px] text-foreground">
        <li className="inline-flex items-center gap-2.5">
          <Users className="h-4 w-4 text-brand" />
          {guests} guest{guests === 1 ? '' : 's'}
        </li>
        {room.sizeSqm && (
          <li className="flex items-center gap-2.5">
            <Ruler className="h-4 w-4 text-brand" />
            {room.sizeSqm} m²
          </li>
        )}
      </ul>

      <p className="mt-5">
        <span className="font-heading text-[32px] leading-none font-light tracking-[-0.01em] text-foreground">
          {formatRate(room.basePrice, room.currency)}
        </span>
        <span className="mt-1.5 block text-sm text-muted-foreground">
          per night
        </span>
      </p>

      <StayCtaLink
        href={bookRoom(room.slug)}
        className="mt-5 w-full justify-center"
      >
        Book now
      </StayCtaLink>
    </div>
  );
}

/**
 * The phone/tablet answer to the sidebar: below lg the rate widget falls
 * after the copy, gallery, amenities, FAQs and reviews, leaving the single
 * most important action a long scroll away. This strip sits at the top of
 * the content column - nightly rate, capacity, and the Book now that
 * carries any chosen dates into checkout.
 */
export function RoomBookStrip({ room }: { room: IPublicRoomDetail }) {
  const guests = room.capacityAdults + room.capacityChildren;
  return (
    <div
      id={ROOM_BOOK_STRIP_ID}
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border border-border bg-card px-5 py-4"
    >
      <div className="min-w-0">
        <p className={EYEBROW}>From</p>
        <p className="mt-1.5">
          <span className="font-heading text-2xl leading-none font-light tracking-[-0.01em] text-foreground">
            {formatRate(room.basePrice, room.currency)}
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            per night
          </span>
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4 flex-none text-brand" />
          Sleeps {guests}
          {room.sizeSqm ? ` · ${room.sizeSqm} m²` : ''}
        </p>
      </div>
      <StayCtaLink
        href={bookRoom(room.slug)}
        className="w-full justify-center min-[400px]:w-auto"
      >
        Book now
      </StayCtaLink>
    </div>
  );
}
