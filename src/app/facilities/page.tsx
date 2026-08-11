// src/app/facilities/page.tsx
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { PageBanner } from '@/components/site/page-banner';
import { FacilitiesSection } from '@/components/home/facilities-section';
import { getPublicFacilities } from '@/lib/hotel/public-facilities';
import { unsplash } from '@/static-data/home';
import { SITE } from '@/config/constants';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Facilities',
  description: `Everything around your suite at ${SITE.name} - the restaurant, pool, fitness studio, and round-the-clock front desk.`,
  path: '/facilities',
});

// Statically cached; facility mutations revalidate this path on demand.
export const revalidate = 3600;

export default async function FacilitiesPage() {
  const facilities = await getPublicFacilities();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageBanner
          title="Facilities"
          image={unsplash('1566073771259-6a8506099945', 2000)}
        />
        <div className="pt-16 lg:pt-[120px]">
          <FacilitiesSection facilities={facilities} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
