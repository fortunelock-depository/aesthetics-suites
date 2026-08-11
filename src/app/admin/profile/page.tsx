// src/app/admin/profile/page.tsx
import type { Metadata } from 'next';
import { requireSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { PageHeader } from '@/components/admin/page-header';
import { ProfileTabs } from '@/components/admin/profile/profile-tabs';
import type { UserRoleValue } from '@/types/user.types';

export const metadata: Metadata = {
  title: 'Profile',
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userId } = await requireSession();
  const { tab } = await searchParams;

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      fullname: true,
      email: true,
      phone: true,
      role: true,
      twoFactorEnabled: true,
      profilePhoto: true,
    },
  });

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Profile"
        description="Your photo, account details and security settings."
      />
      <ProfileTabs
        user={{
          fullname: user?.fullname ?? '',
          email: user?.email ?? '',
          phone: user?.phone ?? null,
          role: (user?.role ?? 'FRONT_DESK') as UserRoleValue,
          photoUrl: user?.profilePhoto ?? null,
        }}
        twoFactorEnabled={user?.twoFactorEnabled ?? false}
        defaultTab={tab === 'security' ? 'security' : 'profile'}
      />
    </section>
  );
}
