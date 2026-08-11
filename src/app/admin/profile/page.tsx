// src/app/admin/profile/page.tsx
import type { Metadata } from 'next';
import { requireSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { PageHeader } from '@/components/admin/page-header';
import { ProfileForm } from '@/components/admin/profile-form';

export const metadata: Metadata = {
  title: 'Profile',
};

export default async function ProfilePage() {
  const { userId } = await requireSession();

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { fullname: true, email: true, phone: true },
  });

  return (
    <section className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your account details as they appear across the console."
      />
      <div className="border border-border bg-card p-4 sm:p-6">
        <ProfileForm
          initial={{
            fullname: user?.fullname ?? '',
            email: user?.email ?? '',
            phone: user?.phone ?? null,
          }}
        />
      </div>
    </section>
  );
}
