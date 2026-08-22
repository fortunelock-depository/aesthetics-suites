// src/app/not-found.tsx
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { CtaLink } from '@/components/site/cta-link';
import { EYEBROW } from '@/components/site/section-heading';
import { routes } from '@/lib/routes';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-20 lg:py-[120px]">
        <div className="w-full max-w-xl text-center">
          <p className={EYEBROW}>Error 404</p>
          <h1 className="mt-4 font-heading text-[34px] leading-[1.15] font-light tracking-[-0.01em] text-foreground lg:text-[52px]">
            Page not found
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-[26px] text-muted-foreground">
            The page you asked for has moved or never existed.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <CtaLink href={routes.home}>Back to home</CtaLink>
            <CtaLink href={routes.rooms} variant="outline" sweep="gold">
              View suites
            </CtaLink>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
