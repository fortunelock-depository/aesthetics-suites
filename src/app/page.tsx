// src/app/page.tsx
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { Hero } from '@/components/home/hero';
import { WelcomeSection } from '@/components/home/welcome-section';
import { RoomsSection } from '@/components/home/rooms-section';
import { VideoBanner } from '@/components/home/video-banner';
import { ServicesRow } from '@/components/home/services-row';
import { FacilitiesSection } from '@/components/home/facilities-section';
import { getPublicRoomCards } from '@/lib/hotel/public-rooms';
import { getPublicFacilities } from '@/lib/hotel/public-facilities';
import { getPublicServices } from '@/lib/hotel/public-services';
import { DEMO_ROOM_CARDS } from '@/static-data/demo-rooms';
import { SITE } from '@/config/constants';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: SITE.title,
  description: SITE.description,
  absoluteTitle: true,
});

// Statically cached; room mutations call revalidatePublicRooms('/') for
// on-demand ISR, and the hourly window catches anything else.
export const revalidate = 3600;

export default async function HomePage() {
  // Static demo cards fill the grid until real rooms are published (the
  // same data the DEMO_SEED writes, so the switch-over is invisible).
  const [dbRooms, facilities, services] = await Promise.all([
    getPublicRoomCards(),
    getPublicFacilities(),
    getPublicServices(),
  ]);
  const rooms = dbRooms.length > 0 ? dbRooms : DEMO_ROOM_CARDS;

  return (
    <>
      <SiteHeader variant="overlay" />
      <main className="flex-1">
        <Hero />
        <WelcomeSection />
        <RoomsSection rooms={rooms} />
        <VideoBanner />
        <ServicesRow services={services} />
        <FacilitiesSection facilities={facilities} />
      </main>
      <SiteFooter />
    </>
  );
}
