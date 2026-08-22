// src/app/admin/users/[id]/page.tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { UserDetailClient } from '@/components/admin/users/user-detail-client';

export const metadata: Metadata = {
  title: 'User details',
};

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId: currentUserId } = await requireSession();
  const { id } = await params;

  // A user's own account is managed from the profile page (self-guards like
  // "no self-delete/demote" live there and in the API).
  if (id === currentUserId) redirect('/admin/profile');

  return <UserDetailClient userId={id} />;
}
