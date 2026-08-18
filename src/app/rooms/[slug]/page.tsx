// src/app/rooms/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageBanner } from '@/components/site/page-banner';
import { GalleryGrid, PhotoGallery } from '@/components/site/photo-gallery';
import { StayLink } from '@/components/rooms/stay-link';
import { Accordion } from '@/components/site/accordion';
import { RoomPriceWidget } from '@/components/rooms/room-price-widget';
import { RoomReviews } from '@/components/rooms/room-reviews';
import { RoomsSidebarWidgets } from '@/components/rooms/rooms-sidebar';
import { getPublicRoomDetail } from '@/lib/hotel/public-room-detail';
import { getPublicRoomCards } from '@/lib/hotel/public-rooms';
import { ROOM_DETAILS_CONTENT, unsplash } from '@/static-data/home';
import { amenityIcon } from '@/lib/amenity-icons';
import { clampDescription } from '@/lib/seo';
import { SITE } from '@/config/constants';
import {
  JsonLd,
  hotelRoomJsonLd,
  breadcrumbJsonLd,
} from '@/lib/structured-data';
import { bookRoom, roomDetail } from '@/lib/routes';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Statically cached; room mutations revalidate these paths on demand.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const room = await getPublicRoomDetail(slug);
  if (!room) {
    return { title: 'Room not found', robots: { index: false, follow: false } };
  }
  return {
    title: room.name,
    description: clampDescription(room.summary, 155),
    alternates: { canonical: `${SITE.url}${roomDetail(slug)}` },
  };
}

export default async function RoomDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const room = await getPublicRoomDetail(slug);
  if (!room) notFound();

  const allRooms = await getPublicRoomCards();

  return (
    <>
      <JsonLd data={hotelRoomJsonLd(room)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Rooms', path: '/rooms' },
          { name: room.name, path: roomDetail(room.slug) },
        ])}
      />
      <main className="flex-1">
        <PageBanner
          title={room.name}
          image={room.photos[0]?.url ?? unsplash('1618773928121-c32242e63f39', 2000)}
          trail={[{ label: 'Room List', href: '/rooms' }]}
        />

        <section className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 py-16 lg:grid-cols-[305px_1fr] lg:px-3 lg:py-[120px]">
          {/* Sidebar: Your Price + Category + Booking Now (template order). */}
          <aside className="order-2 space-y-8 lg:order-1 lg:sticky lg:top-[137px] lg:self-start">
            <div className="border border-border bg-card p-7">
              <h2 className="font-heading text-[22px] font-medium text-foreground">
                Your Price
              </h2>
              <span aria-hidden className="mt-2 block h-0.5 w-10 bg-brand" />
              <div className="mt-5">
                <RoomPriceWidget room={room} />
              </div>
            </div>
            <RoomsSidebarWidgets
              rooms={allRooms}
              bookPath={bookRoom(room.slug)}
            />
          </aside>

          {/* Content column. */}
          <article className="order-1 min-w-0 lg:order-2">
            {/* h2: the banner's h1 already carries the room name - two
                competing h1s made the generic one win in outlines. */}
            {/* Name + a summary of up to 300 characters: never display
                type. Description-sized bold ink on phones, a restrained
                heading from sm. */}
            <h2 className="font-heading text-[15px] leading-[26px] font-bold text-foreground [overflow-wrap:anywhere] sm:text-[22px] sm:leading-[1.4] sm:font-semibold lg:text-[26px]">
              {room.name} - {room.summary}
            </h2>
            {room.description.map((paragraph) => (
              <p
                key={paragraph.slice(0, 40)}
                className="mt-5 text-[15px] leading-[26px] text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}

            {/* Shared-inventory note: this listing sells the same physical
                apartments as its siblings, so a stay under either takes the
                whole apartment. Guests deserve to know before they choose. */}
            {room.alsoSoldAs.length > 0 && (
              <aside
                aria-label="Other ways to book this apartment"
                className="mt-[35px] border border-border bg-card p-5 sm:p-6"
              >
                <p className="text-[15px] font-semibold text-brand-text capitalize">
                  Also available as
                </p>
                <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                  {room.alsoSoldAs.map((sibling) => (
                    <li key={sibling.slug}>
                      <StayLink
                        href={roomDetail(sibling.slug)}
                        className="font-heading text-lg font-medium text-foreground underline-offset-4 transition-colors hover:text-brand-text hover:underline"
                      >
                        {sibling.name}
                      </StayLink>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[15px] leading-[26px] text-muted-foreground">
                  These options share the same apartments. Whichever you
                  book, the whole apartment is reserved for you alone for
                  your dates - any part you have not taken stays locked, and
                  the other option becomes unavailable for those nights.
                </p>
              </aside>
            )}

            {/* Photo gallery: every uploaded photo (up to ten), each
                opening the full-view viewer with previous/next. */}
            {room.photos.length > 0 && (
              <PhotoGallery
                photos={room.photos}
                name={room.name}
                placeholder="room"
              >
                <GalleryGrid className="mt-[35px]" />
              </PhotoGallery>
            )}

            {/* Special check-in instructions. */}
            <h3 className="mt-[45px] font-heading text-[26px] font-medium text-foreground lg:text-[32px]">
              {ROOM_DETAILS_CONTENT.checkInTitle}
            </h3>
            {ROOM_DETAILS_CONTENT.checkInParagraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 40)}
                className="mt-4 text-[15px] leading-[26px] text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}

            <hr className="mt-[45px] border-border" />

            {/* Amenities grid (template's 3-column icon rows). */}
            <h3 className="mt-[45px] font-heading text-[26px] font-medium text-foreground lg:text-[32px]">
              Amenities
            </h3>
            <ul className="mt-6 grid gap-x-8 gap-y-5 min-[480px]:grid-cols-2 lg:grid-cols-3">
              {room.amenities.map((amenity) => {
                const Icon = amenityIcon(amenity);
                return (
                  <li
                    key={amenity}
                    className="flex min-w-0 items-center gap-4 text-[15px] text-foreground"
                  >
                    <Icon
                      className="h-7 w-7 flex-none text-brand"
                      strokeWidth={1.25}
                    />
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      {amenity}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* FAQ accordion (first item open, template behavior). */}
            <div className="mt-[50px]">
              <Accordion
                // The room's own FAQs; the generic house set fills in
                // until any are written.
                items={(room.faqs.length > 0
                  ? room.faqs
                  : ROOM_DETAILS_CONTENT.faqs
                ).map((faq) => ({
                  question: faq.question,
                  answer: faq.answer,
                }))}
              />
            </div>

          </article>
        </section>

        {/* Guest reviews - full-width at the bottom of the page. */}
        <RoomReviews
          slug={room.slug}
          roomName={room.name}
          reviews={room.reviews}
          reviewsTotal={room.reviewsTotal}
          rating={room.rating}
        />
      </main>
    </>
  );
}
