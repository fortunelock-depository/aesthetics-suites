// src/app/admin/bookings/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { BookingsTable } from '@/components/admin/bookings/bookings-table';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Bookings',
};

// Suspense is required: the table reads useSearchParams (URL-synced state).
export default function BookingsPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Every stay - website and walk-in - with its payments and status."
        actions={
          <Button asChild>
            <Link href="/admin/bookings/create">
              <CalendarPlus />
              New booking
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <BookingsTable />
      </Suspense>
    </section>
  );
}
