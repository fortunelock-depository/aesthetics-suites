// src/app/facilities/layout.tsx
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';

/**
 * The public chrome for the facilities section lives in the layout, not
 * the pages: it persists across list -> detail navigation, and a route's
 * loading.tsx then only replaces the page body, so the navbar and footer
 * never blink out while a detail page streams in.
 */
export default function FacilitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
