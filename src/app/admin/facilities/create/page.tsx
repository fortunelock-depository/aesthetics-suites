// src/app/admin/facilities/create/page.tsx
import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { BackLink } from '@/components/admin/back-link';
import { CreateFacilityForm } from '@/components/admin/facilities/create-facility-form';

export const metadata: Metadata = {
  title: 'Add facility',
};

export default function CreateFacilityPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/admin/facilities" label="All facilities" />
      <PageHeader
        title="Add facility"
        description="Create the editorial page for a facility. Photos are added on its page afterwards."
      />
      <CreateFacilityForm />
    </section>
  );
}
