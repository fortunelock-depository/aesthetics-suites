// src/app/admin/bookings/page.tsx
import type { Metadata } from 'next';
import { CalendarCheck } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Bookings',
};

/**
 * Placeholder while this console section's UI is built - the APIs behind
 * it are live (see src/app/api/admin/*).
 */
export default function AdminBookingsPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Bookings" description="Guest bookings: search, status transitions, check-ins and check-outs." />
      <EmptyState
        icon={CalendarCheck}
        title="This section is on its way"
        description="The management screens for bookings are being built. The underlying APIs are already live."
      />
    </section>
  );
}
