// src/app/admin/facilities/page.tsx
import type { Metadata } from 'next';
import { Landmark } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Facilities',
};

/**
 * Placeholder while this console section's UI is built - the APIs behind
 * it are live (see src/app/api/admin/*).
 */
export default function AdminFacilitiesPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Facilities" description="The facility pages shown on the public site - copy, hours, photos." />
      <EmptyState
        icon={Landmark}
        title="This section is on its way"
        description="The management screens for facilities are being built. The underlying APIs are already live."
      />
    </section>
  );
}
