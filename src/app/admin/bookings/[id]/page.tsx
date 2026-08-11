// src/app/admin/bookings/[id]/page.tsx
import type { Metadata } from 'next';
import { BookingDetailClient } from '@/components/admin/bookings/booking-detail-client';

export const metadata: Metadata = {
  title: 'Booking details',
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingDetailClient bookingId={id} />;
}
