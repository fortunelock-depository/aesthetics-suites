// src/app/admin/settings/page.tsx
import type { Metadata } from 'next';
import { requireSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { PageHeader } from '@/components/admin/page-header';
import { SecuritySection } from '@/components/admin/security-section';
import { ChangePasswordForm } from '@/components/admin/change-password-form';

export const metadata: Metadata = {
  title: 'Settings',
};

/** Account settings - security lives here, not in the sidebar. */
export default async function SettingsPage() {
  const { userId } = await requireSession();

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });

  return (
    <section className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your password and two-factor authentication."
      />
      <ChangePasswordForm />
      <SecuritySection initialEnabled={user?.twoFactorEnabled ?? false} />
    </section>
  );
}
