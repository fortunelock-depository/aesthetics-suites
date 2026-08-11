// src/components/rooms/room-price-widget.tsx
import { Ruler, Users } from 'lucide-react';
import { CtaLink } from '@/components/site/cta-link';
import { formatMoney } from '@/lib/format-money';
import type { IPublicRoomDetail } from '@/lib/hotel/public-room-detail';

/**
 * The detail sidebar's "Your Price" widget (template): capacity rows, the
 * big price/Night line, and the gold BOOK NOW (to the contact page until
 * the booking flow lands).
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

      <CtaLink href="/contact" className="mt-5">
        Book Now
      </CtaLink>
    </div>
  );
}
