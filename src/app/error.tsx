// src/app/error.tsx
'use client';

// Route error boundary: catches render/data errors anywhere below the root
// layout (theme, background, and chrome stay intact) and offers a retry.
import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { CtaLink, ctaClasses } from '@/components/site/cta-link';
import { EYEBROW } from '@/components/site/section-heading';
import { routes } from '@/lib/routes';

// The CtaLink treatment carried on a <button>: retrying re-renders the
// boundary in place, so this action cannot be a link.
const RETRY_BUTTON = ctaClasses({ sweep: 'light' });

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the browser console / client-side monitoring; the digest
    // matches the server log entry for the underlying error.
    console.error('Route error boundary:', error);
  }, [error]);

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-20 lg:py-[120px]">
        <div className="w-full max-w-xl text-center">
          <p className={EYEBROW}>Error 500</p>
          <h1 className="mt-4 font-heading text-[34px] leading-[1.15] font-light tracking-[-0.01em] text-foreground lg:text-[52px]">
            Something went wrong
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-[26px] text-muted-foreground">
            This page could not be loaded. The fault has been logged
            {error.digest ? ` under reference ${error.digest}` : ''}.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={reset} className={RETRY_BUTTON}>
              Try again
              <RotateCcw className="h-4 w-4" />
            </button>
            <CtaLink href={routes.home} variant="outline" sweep="gold">
              Back to home
            </CtaLink>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
