// src/app/admin/bookings/create/page.tsx
import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { BackLink } from '@/components/admin/back-link';
import { ManualBookingForm } from '@/components/admin/bookings/manual-booking-form';

export const metadata: Metadata = {
  title: 'New booking',
};

export default function CreateBookingPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/admin/bookings" label="All bookings" />
      <PageHeader
        title="New booking"
        description="Walk-in or phone booking - created confirmed, settled at the desk."
      />
      <ManualBookingForm />
    </section>
  );
}
