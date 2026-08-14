// src/app/admin/bookings/create/page.tsx
import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { BackLink } from '@/components/admin/back-link';
import { ManualBookingForm } from '@/components/admin/bookings/manual-booking-form';
import { requireSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'New booking',
};

export default async function CreateBookingPage() {
  // Price overrides are admin-only (the API enforces it); front desk
  // simply never sees the field.
  const { role } = await requireSession();
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/admin/bookings" label="All bookings" />
      <PageHeader
        title="New booking"
        description="Walk-in or phone booking - created confirmed, settled at the desk."
      />
      <ManualBookingForm canOverrideTotal={role !== 'FRONT_DESK'} />
    </section>
  );
}
