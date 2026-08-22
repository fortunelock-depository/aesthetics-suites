// src/app/page.tsx
import { SiteHeader } from '@/components/site/site-header';
import { JsonLd, lodgingBusinessJsonLd } from '@/lib/structured-data';
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
  // The DB is the only source of truth - unpublished content simply
  // renders honest empty sections.
  const [rooms, facilities, services] = await Promise.all([
    getPublicRoomCards(),
    getPublicFacilities(),
    getPublicServices(),
  ]);

  return (
    <>
      <JsonLd data={lodgingBusinessJsonLd()} />
      <SiteHeader variant="overlay" />
      <main className="flex-1">
        <Hero />
        <WelcomeSection />
        {rooms.length > 0 && <RoomsSection rooms={rooms} />}
        <VideoBanner />
        {services.length > 0 && <ServicesRow services={services} />}
        {/* With no services strip in between, the rows would sit flush
            against the media band above - give them their own top gap. */}
        {facilities.length > 0 && (
          <FacilitiesSection
            facilities={facilities}
            spacedTop={services.length === 0}
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
