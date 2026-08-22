// src/components/rooms/room-price-widget.tsx
import { Ruler, Users } from 'lucide-react';
import { StayCtaLink } from '@/components/rooms/stay-link';
import { formatMoney } from '@/lib/format-money';
import type { IPublicRoomDetail } from '@/lib/hotel/public-room-detail';
import { bookRoom } from '@/lib/routes';

/**
 * The detail sidebar's "Your Price" widget: capacity rows, the big
 * price/Night line, and the gold BOOK NOW into the checkout flow.
 */
export function RoomPriceWidget({ room }: { room: IPublicRoomDetail }) {
  const guests = room.capacityAdults + room.capacityChildren;

  return (
    <div>
      <ul className="space-y-2.5 text-[15px] text-foreground">
        <li className="inline-flex items-center gap-2.5">
          <Users className="h-4 w-4 text-brand" />({guests}) Guest
          {guests === 1 ? '' : 's'}
        </li>
        {room.sizeSqm && (
          <li className="flex items-center gap-2.5">
            <Ruler className="h-4 w-4 text-brand" />
            {room.sizeSqm} m²
          </li>
        )}
      </ul>

      <p className="mt-5">
        <span
          className="font-heading text-[32px] font-semibold text-foreground"
          title={formatMoney(room.basePrice, room.currency)}
        >
          {formatMoney(room.basePrice, room.currency)}
        </span>
        <span className="text-sm text-muted-foreground">/Night</span>
      </p>

      <StayCtaLink href={bookRoom(room.slug)} className="mt-5">
        Book Now
      </StayCtaLink>
    </div>
  );
}

/**
 * The phone/tablet answer to the sidebar: below lg the "Your Price" widget
 * falls after the copy, gallery, amenities, FAQs and reviews, leaving the
 * single most important action a long scroll away. This strip sits at the
 * top of the content column - price per night, capacity, and the gold Book
 * Now that carries any chosen dates into checkout.
 */
export function RoomBookStrip({ room }: { room: IPublicRoomDetail }) {
  const guests = room.capacityAdults + room.capacityChildren;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border border-border bg-card px-5 py-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          From
        </p>
        <p className="mt-0.5">
          <span className="font-heading text-2xl font-semibold text-foreground">
            {formatMoney(room.basePrice, room.currency)}
          </span>
          <span className="text-sm text-muted-foreground">/Night</span>
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4 text-brand" />
          Sleeps {guests}
          {room.sizeSqm ? ` · ${room.sizeSqm} m²` : ''}
        </p>
      </div>
      <StayCtaLink
        href={bookRoom(room.slug)}
        className="w-full justify-center min-[400px]:w-auto"
      >
        Book Now
      </StayCtaLink>
    </div>
  );
}
