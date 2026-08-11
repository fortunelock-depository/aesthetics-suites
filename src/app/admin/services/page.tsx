// src/app/admin/services/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { ServicesTable } from '@/components/admin/services/services-table';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Services',
};

// Suspense is required: the table reads useSearchParams (URL-synced state).
export default function ServicesPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Services"
        description="The guest services pages - dining, transfers, spa treatments and more."
        actions={
          <Button asChild>
            <Link href="/admin/services/create">
              <BellRing />
              Add service
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ServicesTable />
      </Suspense>
    </section>
  );
}
