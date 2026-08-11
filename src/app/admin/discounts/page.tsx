// src/app/admin/discounts/page.tsx
import type { Metadata } from 'next';
import { TicketPercent } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Discounts',
};

/**
 * Placeholder while this console section's UI is built - the APIs behind
 * it are live (see src/app/api/admin/*).
 */
export default function AdminDiscountsPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Discounts" description="Promo codes and automatic promotions across the room catalogue." />
      <EmptyState
        icon={TicketPercent}
        title="This section is on its way"
        description="The management screens for discounts are being built. The underlying APIs are already live."
      />
    </section>
  );
}
