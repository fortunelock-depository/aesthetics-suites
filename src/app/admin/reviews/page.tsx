// src/app/admin/reviews/page.tsx
import type { Metadata } from 'next';
import { Star } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Reviews',
};

/**
 * Placeholder while this console section's UI is built - the APIs behind
 * it are live (see src/app/api/admin/*).
 */
export default function AdminReviewsPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Reviews" description="Moderate guest reviews before they appear under each room listing." />
      <EmptyState
        icon={Star}
        title="This section is on its way"
        description="The management screens for reviews are being built. The underlying APIs are already live."
      />
    </section>
  );
}
