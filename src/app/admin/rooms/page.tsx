// src/app/admin/rooms/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { BedDouble } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { RoomTypesTable } from '@/components/admin/rooms/room-types-table';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Rooms',
};

// Suspense is required: the table reads useSearchParams (URL-synced state).
export default function RoomsPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Rooms"
        description="The listings guests browse and book, with their photos, units and rates."
        actions={
          <Button asChild>
            <Link href="/admin/rooms/create">
              <BedDouble />
              Add room
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <RoomTypesTable />
      </Suspense>
    </section>
  );
}
