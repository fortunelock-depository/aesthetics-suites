// src/app/facilities/page.tsx
import { PageBanner } from '@/components/site/page-banner';
import { SECTION_BANNERS } from '@/static-data/home';
import { EmptyState } from '@/components/ui/empty-state';
import { FacilitiesSection } from '@/components/home/facilities-section';
import { getPublicFacilities } from '@/lib/hotel/public-facilities';
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
    <main id="main" className="flex-1">
      <PageBanner title="Facilities" image={SECTION_BANNERS.facilities} />
      <div className="pt-16 lg:pt-[120px]">
        {facilities.length === 0 ? (
          <div className="mx-auto w-full max-w-[1320px] px-4 pb-16 lg:px-3 lg:pb-[120px]">
            <EmptyState
              variant="site"
              title="Nothing here just yet"
              description="Our facilities are being refreshed - please check back soon."
            />
          </div>
        ) : (
          <FacilitiesSection facilities={facilities} />
        )}
      </div>
    </main>
  );
}
