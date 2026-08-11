// src/app/admin/reviews/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { ReviewsTable } from '@/components/admin/reviews/reviews-table';
import { TablePageSkeleton } from '@/components/admin/skeletons';

export const metadata: Metadata = {
  title: 'Reviews',
};

// Suspense is required: the table reads useSearchParams (URL-synced state).
export default function ReviewsPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Reviews"
        description="Guest reviews await approval here before appearing under their room."
      />
      <Suspense fallback={<TablePageSkeleton columns={6} />}>
        <ReviewsTable />
      </Suspense>
    </section>
  );
}
