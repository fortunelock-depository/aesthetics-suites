// src/app/facilities/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageBanner } from '@/components/site/page-banner';
import { SECTION_BANNERS } from '@/static-data/home';
import { EditorialDetail } from '@/components/site/editorial-detail';
import {
  getPublicFacilities,
  getPublicFacility,
} from '@/lib/hotel/public-facilities';
import { clampDescription } from '@/lib/seo';
import { SITE } from '@/config/constants';
import { JsonLd, breadcrumbJsonLd } from '@/lib/structured-data';
import { facilityDetail } from '@/lib/routes';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Statically cached; facility mutations revalidate these paths on demand.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const facility = await getPublicFacility(slug);
  if (!facility) {
    return {
      title: 'Facility not found',
      robots: { index: false, follow: false },
    };
  }
  return {
    title: facility.name,
    description: clampDescription(facility.summary, 155),
    alternates: { canonical: `${SITE.url}${facilityDetail(slug)}` },
  };
}

export default async function FacilityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const facility = await getPublicFacility(slug);
  if (!facility) notFound();

  const others = (await getPublicFacilities()).filter(
    (other) => other.slug !== slug,
  );

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Facilities', path: '/facilities' },
          { name: facility.name, path: facilityDetail(facility.slug) },
        ])}
      />
      <main className="flex-1">
        <PageBanner
          title={facility.name}
          image={SECTION_BANNERS.facilities}
          trail={[{ label: 'Facilities', href: '/facilities' }]}
        />
        <EditorialDetail
          item={facility}
          scheduleLabel={
            facility.openingHours ? `Open ${facility.openingHours}` : null
          }
          moreTitle="More at the Suites"
          moreLinks={others.map((other) => ({
            href: facilityDetail(other.slug),
            eyebrow: other.eyebrow,
            name: other.name,
          }))}
        />
      </main>
    </>
  );
}
