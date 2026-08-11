// src/app/admin/services/page.tsx
import type { Metadata } from 'next';
import { BellRing } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Services',
};

/**
 * Placeholder while this console section's UI is built - the APIs behind
 * it are live (see src/app/api/admin/*).
 */
export default function AdminServicesPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Services" description="The guest-service pages shown on the public site - copy, availability, photos." />
      <EmptyState
        icon={BellRing}
        title="This section is on its way"
        description="The management screens for services are being built. The underlying APIs are already live."
      />
    </section>
  );
}
