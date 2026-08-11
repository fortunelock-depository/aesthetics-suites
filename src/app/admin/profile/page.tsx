// src/app/admin/profile/page.tsx
import type { Metadata } from 'next';
import { requireSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { PageHeader } from '@/components/admin/page-header';
import { ProfilePhotoCard } from '@/components/admin/profile-photo';
import { ProfileDetails } from '@/components/admin/profile-details';
import type { UserRoleValue } from '@/types/user.types';

export const metadata: Metadata = {
  title: 'Profile',
};

export default async function ProfilePage() {
  const { userId } = await requireSession();

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      fullname: true,
      email: true,
      phone: true,
      role: true,
      twoFactorEnabled: true,
      profilePhoto: true,
      createdAt: true,
    },
  });

  return (
    <section className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your photo and account details."
      />
      <ProfilePhotoCard
        fullname={user?.fullname ?? 'Account'}
        role={(user?.role ?? 'FRONT_DESK') as UserRoleValue}
        photoUrl={user?.profilePhoto ?? null}
      />
      <ProfileDetails
        user={{
          fullname: user?.fullname ?? '',
          email: user?.email ?? '',
          phone: user?.phone ?? null,
          role: (user?.role ?? 'FRONT_DESK') as UserRoleValue,
          twoFactorEnabled: user?.twoFactorEnabled ?? false,
          createdAt: (user?.createdAt ?? new Date()).toISOString(),
        }}
      />
    </section>
  );
}
