// src/app/rooms/page.tsx
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { PageBanner } from '@/components/site/page-banner';
import { Reveal } from '@/components/site/reveal';
import { RoomListItem } from '@/components/rooms/room-list-item';
import { RoomsSidebar } from '@/components/rooms/rooms-sidebar';
import { getPublicRoomCards } from '@/lib/hotel/public-rooms';
import { DEMO_ROOM_CARDS } from '@/static-data/demo-rooms';
import { unsplash } from '@/static-data/home';
import { SITE } from '@/config/constants';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Our Rooms',
  description: `Every suite at ${SITE.name}: prices per night, capacity, and what's inside - browse the full room list and pick your stay.`,
  path: '/rooms',
});

// Statically cached; room mutations revalidate /rooms on demand.
export const revalidate = 3600;

export default async function RoomsPage() {
  // Static demo rooms fill the list until real rooms are published (the
  // same data the DEMO_SEED writes, so the switch-over is invisible).
  const dbRooms = await getPublicRoomCards();
  const rooms = dbRooms.length > 0 ? dbRooms : DEMO_ROOM_CARDS;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageBanner
          title="Room List"
          image={unsplash('1582719478250-c89cae4dc85b', 2000)}
        />

        <section className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 py-16 lg:grid-cols-[305px_1fr] lg:gap-8 lg:px-3 lg:py-[120px]">
          {/* Sidebar above the list on phones, sticky column on desktop. */}
          <RoomsSidebar rooms={rooms} />

          <div id="room-list" className="scroll-mt-28 space-y-[30px]">
            {rooms.map((room, index) => (
              <Reveal key={room.id} delay={Math.min(index, 4) * 0.06}>
                <RoomListItem room={room} />
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
