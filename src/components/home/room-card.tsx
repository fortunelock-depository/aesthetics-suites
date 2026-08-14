// src/components/home/room-card.tsx
import { StayLink } from '@/components/rooms/stay-link';
import { ArrowRight, BedDouble } from 'lucide-react';
import { PhotoFrame } from '@/components/site/photo-frame';
import { formatMoney } from '@/lib/format-money';
import type { IPublicRoomCard } from '@/lib/hotel/public-rooms';

/**
 * A room card copied from the template mechanically: full-bleed photo (no
 * zoom), bottom gradient, and the caption block parked at `bottom: -57px`
 * so its BOOKING NOW row hides below the card edge. Hover slides the whole
 * block to `bottom: 0` (0.4s ease-in-out) while the row fades in above its
 * hairline divider. Below lg (touch - no hover) the block rests at 0 with
 * the row always visible. BOOKING NOW points at the contact anchor until
 * the booking flow lands.
 */
export function RoomCard({ room }: { room: IPublicRoomCard }) {
  return (
    <article className="group relative h-[300px] overflow-hidden sm:h-[357px]">
      <PhotoFrame
        src={room.coverPhoto?.url}
        alt={room.coverPhoto?.alt ?? room.name}
        icon={BedDouble}
        className="absolute inset-0 h-full"
        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 660px"
      />
      {/* Legibility gradient (the template's #0E1317 fade). */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-[#0E1317] via-[#0E1317]/40 to-transparent"
      />

      {/* Caption block: parked 57px low, slides up as one piece on hover. */}
      <div className="absolute inset-x-0 bottom-0 p-[35px] transition-all duration-400 ease-in-out lg:-bottom-[57px] lg:group-hover:bottom-0 lg:group-focus-within:bottom-0">
        <p className="text-sm font-semibold text-white">
          <span className="text-brand-text">
            {formatMoney(room.basePrice, room.currency)}
          </span>{' '}
          / Night
        </p>
        <h3
          className="mt-1 min-w-0 font-heading text-2xl font-medium line-clamp-2 [overflow-wrap:anywhere]"
          title={room.name}
        >
          <StayLink
            href={`/rooms/${room.slug}`}
            className="text-white transition-colors hover:text-brand"
          >
            {room.name}
          </StayLink>
        </h3>

        {/* The simple-btn row: hairline divider + circled arrow + label. */}
        <StayLink
          href={`/rooms/${room.slug}`}
          className="mt-[15px] flex items-center gap-2.5 border-t border-white/50 pt-2.5 text-sm font-semibold tracking-[0.06em] text-neutral-300 uppercase transition-all duration-400 hover:text-brand lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 lg:group-focus-within:opacity-100"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full border border-current transition-colors">
            <ArrowRight className="h-3 w-3" />
          </span>
          Booking Now
        </StayLink>
      </div>
    </article>
  );
}
