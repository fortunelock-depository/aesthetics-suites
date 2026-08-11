// src/app/admin/rooms/page.tsx
import type { Metadata } from 'next';
import { BedDouble } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Rooms',
};

/**
 * Placeholder while this console section's UI is built - the APIs behind
 * it are live (see src/app/api/admin/*).
 */
export default function AdminRoomsPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Rooms" description="Room types, physical units, photos, season rates, and Airbnb calendar sync." />
      <EmptyState
        icon={BedDouble}
        title="This section is on its way"
        description="The management screens for rooms are being built. The underlying APIs are already live."
      />
    </section>
  );
}
