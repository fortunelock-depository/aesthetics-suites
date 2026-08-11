// src/app/admin/services/create/page.tsx
import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { BackLink } from '@/components/admin/back-link';
import { CreateServiceForm } from '@/components/admin/services/create-service-form';

export const metadata: Metadata = {
  title: 'Add service',
};

export default function CreateServicePage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/admin/services" label="All services" />
      <PageHeader
        title="Add service"
        description="Create the editorial page for a service. Photos are added on its page afterwards."
      />
      <CreateServiceForm />
    </section>
  );
}
