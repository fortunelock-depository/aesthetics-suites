// src/app/admin/users/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { UsersTable } from '@/components/admin/users/users-table';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Users',
};

// Suspense is required: UsersTable reads useSearchParams (URL-synced state).
export default function UsersPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Users"
        description="Everyone who can sign in to the admin console."
        actions={
          <Button asChild>
            <Link href="/admin/users/create">
              <UserPlus />
              Add user
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <UsersTable />
      </Suspense>
    </section>
  );
}
