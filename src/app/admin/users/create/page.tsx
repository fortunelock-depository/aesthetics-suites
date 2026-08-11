// src/app/admin/users/create/page.tsx
import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { BackLink } from '@/components/admin/back-link';
import { CreateUserForm } from '@/components/admin/users/create-user-form';

export const metadata: Metadata = {
  title: 'Add user',
};

export default function CreateUserPage() {
  return (
    <section className="space-y-6">
      <BackLink href="/admin/users" label="All users" />
      <PageHeader
        title="Add user"
        description="Create a staff account and choose what it can access."
      />
      <div className="border border-border bg-card p-4 sm:p-6">
        <CreateUserForm />
      </div>
    </section>
  );
}
