// src/app/admin/page.tsx
import type { Metadata } from 'next';
import { OverviewClient } from '@/components/admin/overview-client';

export const metadata: Metadata = {
  title: 'Overview',
};

export default function AdminOverviewPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A quick pulse on Aesthetics Suites.
        </p>
      </div>

      <OverviewClient />
    </section>
  );
}
