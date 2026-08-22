// src/components/home/rooms-section.tsx
import { Reveal } from '@/components/site/reveal';
import { SectionHeading } from '@/components/site/section-heading';
import { cn } from '@/lib/utils';
import type { IPublicRoomCard } from '@/lib/hotel/public-rooms';
import { RoomCard } from './room-card';

/**
 * "Our Luxury Rooms" on its light-gray band: a mixed-width grid of
 * [25%, 50%, 25%] rows then [50%, 50%], 357px tall with 24px gutters. The span pattern repeats every 5 cards for any count;
 * below xl it settles into a 2-col grid, single column on phones.
 */
const SPAN_PATTERN = [
  'xl:col-span-3',
  'xl:col-span-6',
  'xl:col-span-3',
  'xl:col-span-6',
  'xl:col-span-6',
];

export function RoomsSection({ rooms }: { rooms: IPublicRoomCard[] }) {
  return (
    <section id="rooms" className="scroll-mt-24 bg-muted/50 py-16 lg:py-[120px]">
      <div className="mx-auto w-full max-w-[1320px] px-4 lg:px-3">
        <Reveal>
          <SectionHeading eyebrow="Deluxe And Luxury" title="Our Luxury Rooms" />
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-12">
          {rooms.map((room, index) => (
            <Reveal
              key={room.id}
              delay={Math.min(index % 5, 4) * 0.08}
              className={cn(SPAN_PATTERN[index % SPAN_PATTERN.length])}
            >
              <RoomCard room={room} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
