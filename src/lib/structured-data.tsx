// src/lib/structured-data.tsx
//
// JSON-LD builders for the hotel's rich-result surfaces. A hotel is the
// canonical structured-data vertical: LodgingBusiness on the homepage,
// HotelRoom + Offer (+ AggregateRating) on room pages, BreadcrumbList on
// the banner trails. Rendered from Server Components, so the markup ships
// in the static HTML crawlers read.
import { SITE, CONTACT } from '@/config/constants';
import { roomDetail } from '@/lib/routes';

/** ISO date one year out - see the Offer's priceValidUntil. */
function priceValidUntil(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/** Serializes a schema.org object into a JSON-LD script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Server-built objects only, and `<` is escaped so admin-entered
      // text (room names, summaries) can never break out of the script
      // element with a literal "</script>".
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}

export function lodgingBusinessJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    image: `${SITE.url}/logo-mark.png`,
    telephone: CONTACT.phone,
    email: CONTACT.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: CONTACT.street,
      addressLocality: 'Tamale',
      addressCountry: 'GH',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: CONTACT.map.lat,
      longitude: CONTACT.map.lng,
    },
  };
}

export function hotelRoomJsonLd(room: {
  name: string;
  slug: string;
  summary: string;
  basePrice: number;
  currency: string;
  capacityAdults: number;
  photos: { url: string }[];
  rating: { average: number; count: number } | null;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HotelRoom',
    name: room.name,
    description: room.summary,
    url: `${SITE.url}${roomDetail(room.slug)}`,
    ...(room.photos.length > 0
      ? { image: room.photos.map((photo) => photo.url) }
      : {}),
    occupancy: {
      '@type': 'QuantitativeValue',
      maxValue: room.capacityAdults,
      unitText: 'adults',
    },
    containedInPlace: { '@type': 'Hotel', name: SITE.name, url: SITE.url },
    offers: {
      '@type': 'Offer',
      // Nightly base rate in major units (basePrice is minor units).
      price: (room.basePrice / 100).toFixed(2),
      priceCurrency: room.currency,
      availability: 'https://schema.org/InStock',
      url: `${SITE.url}${roomDetail(room.slug)}`,
      // Google warns on an Offer without this. The rate card is open-ended,
      // so it is quoted a year out and refreshed on every rebuild rather
      // than implying a promotion that expires.
      priceValidUntil: priceValidUntil(),
    },
    ...(room.rating && room.rating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: room.rating.average.toFixed(1),
            reviewCount: room.rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(
  trail: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE.url}${crumb.path}`,
    })),
  };
}
