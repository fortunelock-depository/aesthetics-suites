// src/app/admin/facilities/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { FacilitiesTable } from '@/components/admin/facilities/facilities-table';
import { TablePageSkeleton } from '@/components/admin/skeletons';

export const metadata: Metadata = {
  title: 'Facilities',
};

// Suspense is required: the table reads useSearchParams (URL-synced state).
export default function FacilitiesPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Facilities"
        description="The amenities pages guests browse - pool, restaurant, garden and more."
        actions={
          <Button asChild>
            <Link href="/admin/facilities/create">
              <Landmark />
              Add facility
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<TablePageSkeleton columns={5} />}>
        <FacilitiesTable />
      </Suspense>
    </section>
  );
}
