// src/app/admin/users/[id]/page.tsx
import type { Metadata } from 'next';
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
  // The session's userId powers the self-guards (no self-delete/demote).
  const { userId: currentUserId } = await requireSession();
  const { id } = await params;

  return <UserDetailClient userId={id} currentUserId={currentUserId} />;
}
