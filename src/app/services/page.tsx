// src/app/services/page.tsx
import { PageBanner } from '@/components/site/page-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { InterlockingRows } from '@/components/site/interlocking-rows';
import { getPublicServices } from '@/lib/hotel/public-services';
import { SITE } from '@/config/constants';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Services',
  description: `The services around your stay at ${SITE.name} - daily housekeeping, fast Wi-Fi, and door-to-door transfers, all arranged at the front desk.`,
  path: '/services',
});

// Statically cached; service mutations revalidate this path on demand.
export const revalidate = 3600;

export default async function ServicesPage() {
  const services = await getPublicServices();

  return (
    <main className="flex-1">
      <PageBanner title="Services" image={'/images/services-bg.webp'} />
      <div className="pt-16 lg:pt-[120px]">
        {services.length === 0 ? (
          <div className="mx-auto w-full max-w-[1320px] px-4 pb-16 lg:px-3 lg:pb-[120px]">
            <EmptyState
              variant="site"
              title="Nothing here just yet"
              description="Our services are being refreshed - please check back soon."
            />
          </div>
        ) : (
          <InterlockingRows items={services} hrefBase="/services" />
        )}
      </div>
    </main>
  );
}
