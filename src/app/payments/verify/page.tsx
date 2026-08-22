// src/app/payments/verify/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { PaymentVerifyClient } from '@/components/payments/payment-verify-client';

export const metadata: Metadata = {
  title: 'Payment status',
  robots: { index: false, follow: false },
};

// Suspense is required: the client component reads useSearchParams.
export default function PaymentVerifyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
        <Suspense
          fallback={
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          }
        >
          <PaymentVerifyClient />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
