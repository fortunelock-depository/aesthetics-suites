// src/app/bookings/page.tsx
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { PageBanner } from '@/components/site/page-banner';
import { ManageBookingClient } from '@/components/rooms/manage-booking-client';
import { SECTION_BANNERS } from '@/static-data/home';

export const metadata: Metadata = {
  title: 'Manage your booking',
  description:
    'Check your booking status, complete an unfinished payment, or cancel your stay.',
  robots: { index: false, follow: false },
};

export default async function ManageBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; email?: string }>;
}) {
  // Prefill from the complete-payment email link; junk is just ignored.
  const query = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
      <PageBanner
        title="Manage Booking"
        image={SECTION_BANNERS.rooms}
      />
      <div className="mx-auto w-full max-w-[1320px] px-4 py-16 lg:px-3 lg:py-[120px]">
        <p className="mx-auto max-w-xl pb-8 text-center text-[15px] leading-[26px] text-muted-foreground">
          Enter your booking code (from your confirmation email) and the
          email address you booked with to see your stay, finish an
          unfinished payment, or cancel.
        </p>
        <ManageBookingClient
          initialCode={(query.code ?? '').slice(0, 30)}
          initialEmail={(query.email ?? '').slice(0, 255)}
        />
      </div>
      </main>
      <SiteFooter />
    </>
  );
}
