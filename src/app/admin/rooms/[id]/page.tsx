// src/app/admin/rooms/[id]/page.tsx
import type { Metadata } from 'next';
import { RoomTypeDetailClient } from '@/components/admin/rooms/room-type-detail-client';

export const metadata: Metadata = {
  title: 'Room details',
};

export default async function RoomTypeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RoomTypeDetailClient roomTypeId={id} />;
}
