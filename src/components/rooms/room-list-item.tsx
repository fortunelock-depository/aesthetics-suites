// src/components/rooms/room-list-item.tsx
import { StayLink } from '@/components/rooms/stay-link';
import { ArrowRight, BedDouble, Ruler, Star, Users } from 'lucide-react';
import { PhotoFrame } from '@/components/site/photo-frame';
import { formatRate } from '@/lib/format-money';
import type { IPublicRoomCard } from '@/lib/hotel/public-rooms';
import { roomDetail } from '@/lib/routes';

/**
 * One row of the room list: bordered card - photo left (4:3), content with
 * a hairline divider on its right, then the centered meta column (rate,
 * star rating, view suite). Stacks photo-on-top below lg; the meta column
 * becomes a bottom row so the rate and actions never squeeze the text.
 *
 * The row is a single target: the title link stretches over the whole card
 * (`after:inset-0`), so the photo, the meta column and the "View suite"
 * marker all lead to the same place with one accessible name.
 */
export function RoomListItem({ room }: { room: IPublicRoomCard }) {
  const guests = room.capacityAdults + room.capacityChildren;

  return (
    <article
      id={room.slug}
      className="group relative scroll-mt-28 border border-border bg-card lg:flex lg:items-stretch"
    >
      {/* Photo: the wrapper clips, the frame inside is what scales. */}
      <div className="relative h-[220px] w-full flex-none overflow-hidden sm:h-[260px] lg:h-[308px] lg:w-[410px]">
        <PhotoFrame
          src={room.coverPhoto?.url}
          alt={room.coverPhoto?.alt ?? room.name}
          icon={BedDouble}
          className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          sizes="(max-width: 1024px) 100vw, 410px"
        />
      </div>

      <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between lg:px-[50px] lg:py-0">
        {/* Content, divided from the meta column on desktop. */}
        <div className="min-w-0 lg:border-r lg:border-border lg:pr-[65px]">
          <h3
            className="min-w-0 font-heading text-2xl leading-[1.2] font-light tracking-[-0.01em] line-clamp-2 [overflow-wrap:anywhere]"
            title={room.name}
          >
            <StayLink
              href={roomDetail(room.slug)}
              className="text-foreground transition-colors after:absolute after:inset-0 group-hover:text-brand-text"
            >
              {room.name}
            </StayLink>
          </h3>
          <p className="mt-2 max-w-[330px] text-[15px] leading-[26px] text-muted-foreground line-clamp-3">
            {room.summary}
          </p>
          <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground">
            <li className="inline-flex items-center gap-2.5">
              <Users className="h-4 w-4 text-brand" />
              {guests} guest{guests === 1 ? '' : 's'}
            </li>
            {room.sizeSqm ? (
              <li className="inline-flex items-center gap-2.5">
                <Ruler className="h-4 w-4 text-brand" />
                {room.sizeSqm} m²
              </li>
            ) : (
              <li className="inline-flex items-center gap-2.5">
                <BedDouble className="h-4 w-4 text-brand" />
                {room.unitCount} suite{room.unitCount === 1 ? '' : 's'}
              </li>
            )}
          </ul>
        </div>

        {/* Meta column: rate, rating, the row's action marker. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 lg:flex-none lg:flex-col lg:items-center lg:gap-3 lg:text-center">
          <p>
            <span className="font-heading text-[22px] leading-none font-light tracking-[-0.01em] text-brand-text lg:text-[24px]">
              {formatRate(room.basePrice, room.currency)}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              per night
            </span>
          </p>
          {/* Rating always sits on the card; "New" until reviews exist. */}
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-brand text-brand" />
            {room.rating && room.rating.count > 0 ? (
              <>
                <span className="text-sm font-medium text-foreground">
                  {room.rating.average}
                </span>
                {room.rating.count} review
                {room.rating.count === 1 ? '' : 's'}
              </>
            ) : (
              <span className="text-sm font-medium text-foreground">New</span>
            )}
          </p>
          {/* Marker, not a second link: the stretched title link owns the row. */}
          <span
            aria-hidden
            className="inline-flex items-center gap-2.5 text-[13px] font-medium tracking-[0.14em] text-foreground uppercase transition-colors group-hover:text-brand-text"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full border border-current">
              <ArrowRight className="h-3 w-3" />
            </span>
            View suite
          </span>
        </div>
      </div>
    </article>
  );
}
