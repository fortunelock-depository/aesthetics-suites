// src/app/admin/services/[id]/page.tsx
import type { Metadata } from 'next';
import { ServiceDetailClient } from '@/components/admin/services/service-detail-client';

export const metadata: Metadata = {
  title: 'Service details',
};

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ServiceDetailClient serviceId={id} />;
}
