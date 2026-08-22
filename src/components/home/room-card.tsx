// src/components/home/room-card.tsx
import { StayLink } from '@/components/rooms/stay-link';
import { ArrowRight, BedDouble } from 'lucide-react';
import { PhotoFrame } from '@/components/site/photo-frame';
import { formatRate } from '@/lib/format-money';
import type { IPublicRoomCard } from '@/lib/hotel/public-rooms';
import { roomDetail } from '@/lib/routes';

/**
 * A room card: full-bleed photo (no zoom), bottom gradient, and the caption
 * block parked at `bottom: -57px` so its link row hides below the card
 * edge. Hover slides the whole block to `bottom: 0` (0.4s ease-in-out)
 * while the row fades in above its hairline divider. Below lg (touch - no
 * hover) the block rests at 0 with the row always visible.
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
      {/* Legibility gradient: the ink wash rises only far enough to carry
          the caption, so the photograph keeps its top two thirds. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-scrim/85 via-scrim/35 to-transparent"
      />

      {/* Caption block: parked 57px low, slides up as one piece on hover. */}
      <div className="absolute inset-x-0 bottom-0 p-[35px] transition-all duration-400 ease-in-out lg:-bottom-[57px] lg:group-hover:bottom-0 lg:group-focus-within:bottom-0">
        <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="font-heading text-xl font-normal text-brand">
            {formatRate(room.basePrice, room.currency)}
          </span>
          <span className="text-xs tracking-[0.1em] text-white/70 uppercase">
            per night
          </span>
        </p>
        <h3
          className="mt-1.5 min-w-0 font-heading text-[26px] font-normal tracking-[-0.01em] line-clamp-2 [overflow-wrap:anywhere]"
          title={room.name}
        >
          <StayLink
            href={roomDetail(room.slug)}
            className="text-white transition-colors hover:text-brand"
          >
            {room.name}
          </StayLink>
        </h3>

        {/* The link row: hairline divider + circled arrow + label. */}
        <StayLink
          href={roomDetail(room.slug)}
          className="mt-[15px] flex items-center gap-2.5 border-t border-white/40 pt-2.5 text-[13px] font-medium tracking-[0.14em] text-white/80 uppercase transition-all duration-400 hover:text-brand lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 lg:group-focus-within:opacity-100"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full border border-current transition-colors">
            <ArrowRight className="h-3 w-3" />
          </span>
          Check availability
        </StayLink>
      </div>
    </article>
  );
}
