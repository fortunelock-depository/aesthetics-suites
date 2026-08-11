// src/app/admin/discounts/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import {
  AddDiscountButton,
  DiscountsTable,
} from '@/components/admin/discounts/discounts-table';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Discounts',
};

// Suspense is required: the table reads useSearchParams (URL-synced state).
export default function DiscountsPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Discounts"
        description="Promo codes guests type at checkout, and automatic discounts on eligible stays."
        actions={<AddDiscountButton />}
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <DiscountsTable />
      </Suspense>
    </section>
  );
}
