// src/app/admin/tax-fees/page.tsx
import type { Metadata } from 'next';
import { ReceiptText } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Tax & Fees',
};

/**
 * Placeholder while this console section's UI is built - the APIs behind
 * it are live (see src/app/api/admin/*).
 */
export default function AdminTaxFeesPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Tax & Fees" description="Percentage taxes and levies applied to every booking total." />
      <EmptyState
        icon={ReceiptText}
        title="This section is on its way"
        description="The management screens for tax & fees are being built. The underlying APIs are already live."
      />
    </section>
  );
}
