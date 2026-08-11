// src/app/admin/security/page.tsx
import type { Metadata } from 'next';
import { requireSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { SecuritySection } from '@/components/admin/security-section';
import { ChangePasswordForm } from '@/components/admin/change-password-form';
import { PageHeader } from '@/components/admin/page-header';

export const metadata: Metadata = {
  title: 'Security',
};

export default async function SecurityPage() {
  const { userId } = await requireSession();

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });

  return (
    <section className="space-y-6">
      <PageHeader
        title="Security"
        description="Your password and two-factor authentication."
      />
      <ChangePasswordForm />
      <SecuritySection initialEnabled={user?.twoFactorEnabled ?? false} />
    </section>
  );
}
