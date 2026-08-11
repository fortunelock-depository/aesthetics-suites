// src/app/admin/facilities/[id]/page.tsx
import type { Metadata } from 'next';
import { FacilityDetailClient } from '@/components/admin/facilities/facility-detail-client';

export const metadata: Metadata = {
  title: 'Facility details',
};

export default async function FacilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FacilityDetailClient facilityId={id} />;
}
