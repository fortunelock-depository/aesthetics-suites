// src/app/admin/rooms/create/page.tsx
import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { BackLink } from '@/components/admin/back-link';
import { CreateRoomTypeWizard } from '@/components/admin/rooms/create-room-type-wizard';

export const metadata: Metadata = {
  title: 'Add room',
};

export default function CreateRoomPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/admin/rooms" label="All rooms" />
      <PageHeader
        title="Add room"
        description="Create a room listing step by step. Photos and physical units are added on its page afterwards."
      />
      <CreateRoomTypeWizard />
    </section>
  );
}
