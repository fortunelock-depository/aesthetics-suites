// src/app/services/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageBanner } from '@/components/site/page-banner';
import { EditorialDetail } from '@/components/site/editorial-detail';
import {
  getPublicServices,
  getPublicService,
} from '@/lib/hotel/public-services';
import { clampDescription } from '@/lib/seo';
import { SITE } from '@/config/constants';
import { JsonLd, breadcrumbJsonLd } from '@/lib/structured-data';
import { serviceDetail } from '@/lib/routes';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Statically cached; service mutations revalidate these paths on demand.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublicService(slug);
  if (!service) {
    return {
      title: 'Service not found',
      robots: { index: false, follow: false },
    };
  }
  return {
    title: service.name,
    description: clampDescription(service.summary, 155),
    alternates: { canonical: `${SITE.url}${serviceDetail(slug)}` },
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = await getPublicService(slug);
  if (!service) notFound();

  const others = (await getPublicServices()).filter(
    (other) => other.slug !== slug,
  );

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
          { name: service.name, path: serviceDetail(service.slug) },
        ])}
      />
      <main className="flex-1">
        <PageBanner
          title={service.name}
          image={service.photos[0]?.url ?? ''}
          trail={[{ label: 'Services', href: '/services' }]}
        />
        <EditorialDetail
          item={service}
          scheduleLabel={
            service.availability ? `Available ${service.availability}` : null
          }
          moreTitle="More guest services"
          moreLinks={others.map((other) => ({
            href: serviceDetail(other.slug),
            eyebrow: other.eyebrow,
            name: other.name,
          }))}
        />
      </main>
    </>
  );
}
