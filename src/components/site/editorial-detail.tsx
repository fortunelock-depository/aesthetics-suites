// src/components/site/editorial-detail.tsx
import Link from 'next/link';
import { Clock, Sparkles } from 'lucide-react';
import { PhotoFrame } from './photo-frame';
import { CtaLink } from './cta-link';
import { amenityIcon } from '@/lib/amenity-icons';
import type { IEditorialDetail } from '@/lib/hotel/editorial';

/**
 * The shared detail-page body for editorial content (facilities and
 * services): eyebrow, summary headline, schedule chip, cover, paragraphs,
 * the "What you'll find" icon grid, gallery, CTAs, and cross-links so the
 * page never dead-ends.
 */
export function EditorialDetail({
  item,
  scheduleLabel,
  moreTitle,
  moreLinks,
}: {
  item: IEditorialDetail;
  /** Full chip line, e.g. "Open 6:30 AM - 10 PM" / "Available any time". */
  scheduleLabel: string | null;
  /** Heading for the cross-link grid, e.g. "More at the Suites". */
  moreTitle: string;
  moreLinks: { href: string; eyebrow: string; name: string }[];
}) {
  const [cover, ...gallery] = item.photos;

  return (
    <article className="mx-auto w-full max-w-[966px] px-4 py-16 lg:px-3 lg:py-[120px]">
      <p className="text-[15px] font-semibold text-brand-text capitalize">
        {item.eyebrow}
      </p>
      <h2 className="mt-2.5 font-heading text-[28px] leading-[1.3] font-medium text-foreground [overflow-wrap:anywhere] lg:text-[35px]">
        {item.summary}
      </h2>

      {scheduleLabel && (
        <p className="mt-5 inline-flex items-center gap-2.5 border border-border bg-card px-5 py-3 text-[15px] text-foreground">
          <Clock className="h-4 w-4 text-brand" />
          {scheduleLabel}
        </p>
      )}

      <PhotoFrame
        src={cover?.url}
        alt={cover?.alt ?? item.name}
        icon={Sparkles}
        className="mt-[35px] aspect-video w-full"
        sizes="(max-width: 1024px) 100vw, 966px"
      />

      {item.description.map((paragraph) => (
        <p
          key={paragraph.slice(0, 40)}
          className="mt-5 text-[15px] leading-[26px] text-muted-foreground"
        >
          {paragraph}
        </p>
      ))}

      {/* Highlights icon grid (same language as the room amenities). */}
      {item.highlights.length > 0 && (
        <>
          <h3 className="mt-[45px] font-heading text-[26px] font-medium text-foreground lg:text-[32px]">
            What you&apos;ll find
          </h3>
          <ul className="mt-6 grid gap-x-8 gap-y-5 min-[480px]:grid-cols-2 lg:grid-cols-3">
            {item.highlights.map((highlight) => {
              const Icon = amenityIcon(highlight);
              return (
                <li
                  key={highlight}
                  className="flex min-w-0 items-center gap-4 text-[15px] text-foreground"
                >
                  <Icon
                    className="h-7 w-7 flex-none text-brand"
                    strokeWidth={1.25}
                  />
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {highlight}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {gallery.length > 0 && (
        <div className="mt-[35px] grid gap-6 sm:grid-cols-2">
          {gallery.slice(0, 4).map((photo) => (
            <PhotoFrame
              key={photo.url}
              src={photo.url}
              alt={photo.alt ?? item.name}
              icon={Sparkles}
              className="h-[250px] w-full"
              sizes="(max-width: 640px) 100vw, 470px"
            />
          ))}
        </div>
      )}

      <div className="mt-[45px] flex flex-wrap gap-4">
        <CtaLink href="/rooms">Book a stay</CtaLink>
        <CtaLink href="/contact" variant="outline" sweep="gold">
          Ask a question
        </CtaLink>
      </div>

      {moreLinks.length > 0 && (
        <nav aria-label={moreTitle} className="mt-[60px]">
          <h3 className="font-heading text-[22px] font-medium text-foreground">
            {moreTitle}
          </h3>
          <ul className="mt-4 grid gap-4 min-[480px]:grid-cols-2">
            {moreLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group block border border-border bg-card p-4 transition-colors hover:border-brand"
                >
                  <p className="text-xs font-semibold text-brand-text capitalize">
                    {link.eyebrow}
                  </p>
                  <p className="mt-1 min-w-0 truncate font-heading text-base font-medium text-foreground group-hover:text-brand-text">
                    {link.name}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </article>
  );
}
