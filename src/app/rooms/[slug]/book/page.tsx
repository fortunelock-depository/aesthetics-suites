// src/app/rooms/[slug]/book/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageBanner } from '@/components/site/page-banner';
import { BookingCheckout } from '@/components/rooms/booking-checkout';
import { getPublicRoomDetail } from '@/lib/hotel/public-room-detail';
import { unsplash } from '@/static-data/home';
import { roomDetail } from '@/lib/routes';

interface BookPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
  }>;
}

export async function generateMetadata({
  params,
}: BookPageProps): Promise<Metadata> {
  const { slug } = await params;
  const room = await getPublicRoomDetail(slug);
  return {
    title: room ? `Book ${room.name}` : 'Book a room',
    robots: { index: false, follow: false },
  };
}

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/** Query prefill, defensively parsed - bad params never break the page. */
function parseIntParam(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

export default async function BookRoomPage({
  params,
  searchParams,
}: BookPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const room = await getPublicRoomDetail(slug);
  if (!room) notFound();

  return (
    <main className="flex-1">
      <PageBanner
        title="Book Your Stay"
        image={
          room.photos[0]?.url ?? unsplash('1618773928121-c32242e63f39', 2000)
        }
        trail={[
          { label: 'Room List', href: '/rooms' },
          { label: room.name, href: roomDetail(room.slug) },
        ]}
      />
      <div className="mx-auto w-full max-w-[1320px] px-4 py-16 lg:px-3 lg:py-[120px]">
        <BookingCheckout
          room={room}
          initialCheckIn={
            query.checkIn && DATE_SHAPE.test(query.checkIn) ? query.checkIn : ''
          }
          initialCheckOut={
            query.checkOut && DATE_SHAPE.test(query.checkOut)
              ? query.checkOut
              : ''
          }
          initialAdults={parseIntParam(query.adults, 2, 1, 8)}
          initialChildren={parseIntParam(query.children, 0, 0, 8)}
        />
      </div>
    </main>
  );
}
