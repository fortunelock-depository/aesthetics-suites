// src/app/bookings/page.tsx
import type { Metadata } from 'next';
import { PageBanner } from '@/components/site/page-banner';
import { ManageBookingClient } from '@/components/rooms/manage-booking-client';
import { unsplash } from '@/static-data/home';

export const metadata: Metadata = {
  title: 'Manage your booking',
  description:
    'Check your booking status, complete an unfinished payment, or cancel your stay.',
  robots: { index: false, follow: false },
};

export default function ManageBookingPage() {
  return (
    <>
      <PageBanner
        title="Manage Booking"
        image={unsplash('1618773928121-c32242e63f39', 2000)}
      />
      <div className="mx-auto w-full max-w-[1320px] px-4 py-16 lg:px-3 lg:py-[120px]">
        <p className="mx-auto max-w-xl pb-8 text-center text-[15px] leading-[26px] text-muted-foreground">
          Enter your booking code (from your confirmation email) and the
          email address you booked with to see your stay, finish an
          unfinished payment, or cancel.
        </p>
        <ManageBookingClient />
      </div>
    </>
  );
}
