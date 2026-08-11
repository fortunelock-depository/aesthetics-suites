// src/app/admin/users/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { UsersTable } from '@/components/admin/users/users-table';
import { AddUserButton } from '@/components/admin/users/create-user-dialog';
import { TablePageSkeleton } from '@/components/admin/skeletons';

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
        actions={<AddUserButton />}
      />
      <Suspense fallback={<TablePageSkeleton columns={5} />}>
        <UsersTable />
      </Suspense>
    </section>
  );
}
