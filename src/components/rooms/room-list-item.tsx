// src/components/rooms/room-list-item.tsx
import { StayLink } from '@/components/rooms/stay-link';
import { ArrowRight, BedDouble, Ruler, Star, Users } from 'lucide-react';
import { PhotoFrame } from '@/components/site/photo-frame';
import { formatMoney } from '@/lib/format-money';
import type { IPublicRoomCard } from '@/lib/hotel/public-rooms';
import { roomDetail } from '@/lib/routes';

/**
 * One row of the room list: bordered white card - photo left (300x250),
 * content with a hairline divider on its right, then the centered meta
 * column (gold price, star rating, READ MORE). Stacks photo-on-top below
 * lg; the meta column becomes a bottom row so price and actions never
 * squeeze the text.
 */
export function RoomListItem({ room }: { room: IPublicRoomCard }) {
  const guests = room.capacityAdults + room.capacityChildren;

  return (
    <article
      id={room.slug}
      className="scroll-mt-28 border border-border bg-card lg:flex lg:items-stretch"
    >
      {/* Photo */}
      <PhotoFrame
        src={room.coverPhoto?.url}
        alt={room.coverPhoto?.alt ?? room.name}
        icon={BedDouble}
        className="h-[220px] w-full flex-none sm:h-[250px] lg:w-[300px]"
        sizes="(max-width: 1024px) 100vw, 300px"
      />

      <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between lg:px-[50px] lg:py-0">
        {/* Content, divided from the meta column on desktop. */}
        <div className="min-w-0 lg:border-r lg:border-border lg:pr-[65px]">
          <h3
            className="min-w-0 font-heading text-2xl font-medium line-clamp-2 [overflow-wrap:anywhere]"
            title={room.name}
          >
            <StayLink
              href={roomDetail(room.slug)}
              className="text-foreground transition-colors hover:text-brand-text"
            >
              {room.name}
            </StayLink>
          </h3>
          <p className="mt-2 max-w-[330px] text-[15px] leading-[26px] text-muted-foreground line-clamp-3">
            {room.summary}
          </p>
          <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground">
            <li className="inline-flex items-center gap-2.5">
              <Users className="h-4 w-4 text-brand" />({guests}) Guest
              {guests === 1 ? '' : 's'}
            </li>
            {room.sizeSqm ? (
              <li className="inline-flex items-center gap-2.5">
                <Ruler className="h-4 w-4 text-brand" />
                {room.sizeSqm} m²
              </li>
            ) : (
              <li className="inline-flex items-center gap-2.5">
                <BedDouble className="h-4 w-4 text-brand" />({room.unitCount})
                Suite{room.unitCount === 1 ? '' : 's'}
              </li>
            )}
          </ul>
        </div>

        {/* Meta column: price, rating, read-more (centered on desktop). */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 lg:flex-none lg:flex-col lg:items-center lg:gap-3 lg:text-center">
          <p
            className="font-heading text-sm font-semibold text-brand-text"
            title={formatMoney(room.basePrice, room.currency)}
          >
            {formatMoney(room.basePrice, room.currency)}/Night
          </p>
          {/* Rating always sits on the card; "New" until reviews exist. */}
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-brand text-brand" />
            {room.rating && room.rating.count > 0 ? (
              <>
                <span className="text-sm font-semibold text-foreground">
                  {room.rating.average}
                </span>
                {room.rating.count} review
                {room.rating.count === 1 ? '' : 's'}
              </>
            ) : (
              <span className="text-sm font-semibold text-foreground">New</span>
            )}
          </p>
          <StayLink
            href={roomDetail(room.slug)}
            className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-[0.06em] text-foreground uppercase transition-colors hover:text-brand-text"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full border border-current">
              <ArrowRight className="h-3 w-3" />
            </span>
            Read More
          </StayLink>
        </div>
      </div>
    </article>
  );
}
