// src/components/site/detail-skeletons.tsx
//
// Loading states for the public detail routes. Each mirrors the page it
// stands in for (banner, then that page's own content shape) and is
// rendered inside the section layout, so the navbar and footer stay put
// while the page streams in.
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { PhotoFrame } from './photo-frame';
import { routes } from '@/lib/routes';
import { SECTION_BANNERS } from '@/static-data/home';

type Section = keyof typeof SECTION_BANNERS;

const SECTION_LIST: Record<Section, { label: string; href: string }> = {
  rooms: { label: 'Rooms & Suites', href: routes.rooms },
  facilities: { label: 'Facilities', href: routes.facilities },
  services: { label: 'Services', href: routes.services },
};

/**
 * The real PageBanner, minus what is not known yet. Every page of a section
 * shares the section's banner photo (SECTION_BANNERS), so the photo, the
 * scrim and the "Home - Rooms & Suites" part of the breadcrumb are painted
 * for real; only the item's title and its crumb are placeholder bars. When the
 * data lands the banner does not change - the bars simply become text.
 */
export function BannerSkeleton({
  section,
  title,
  extraCrumb = false,
}: {
  section: Section;
  /** A title known before the data loads (e.g. "Book your stay"). */
  title?: string;
  /** Room checkout: Home - Rooms & Suites - {room} - Book your stay. */
  extraCrumb?: boolean;
}) {
  const list = SECTION_LIST[section];
  const dash = (
    <span aria-hidden className="text-white/60">
      -
    </span>
  );
  return (
    <div className="relative">
      <PhotoFrame
        src={SECTION_BANNERS[section]}
        alt=""
        className="absolute inset-0 -z-10 h-full"
        sizes="100vw"
        priority
      />
      {/* The same two-layer wash as PageBanner, so the banner does not
          change tone when the data lands. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-scrim/40" />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-3/4 bg-linear-to-t from-scrim/60 to-transparent"
      />
      <div className="mx-auto flex min-h-[280px] w-full max-w-[1320px] flex-col items-center justify-center px-4 py-16 text-center lg:min-h-[330px] lg:px-3">
        {title ? (
          <p className="font-heading text-[38px] leading-[1.15] font-light tracking-[-0.01em] text-white lg:text-[58px]">
            {title}
          </p>
        ) : (
          <Skeleton className="h-[43px] w-64 bg-white/20 lg:h-[66px] lg:w-[420px]" />
        )}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[15px] font-medium">
          <Link href={routes.home} className="text-white">
            Home
          </Link>
          {dash}
          <Link href={list.href} className="text-white">
            {list.label}
          </Link>
          {extraCrumb && (
            <>
              {dash}
              <Skeleton className="h-4 w-28 bg-white/20" />
            </>
          )}
          {dash}
          {title ? (
            <span className="text-brand">{title}</span>
          ) : (
            <Skeleton className="h-4 w-24 bg-brand/40" />
          )}
        </div>
      </div>
    </div>
  );
}

/** A run of body-copy lines. */
function Paragraph({ lines = 4 }: { lines?: number }) {
  const widths = ['w-full', 'w-11/12', 'w-full', 'w-4/6', 'w-5/6', 'w-3/4'];
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

/** Room detail: banner, sidebar (price + widgets) beside the article. */
export function RoomDetailSkeleton() {
  return (
    <main className="flex-1">
      <BannerSkeleton section="rooms" />
      <section className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 py-16 lg:grid-cols-[305px_1fr] lg:px-3 lg:py-[120px]">
        <aside className="order-2 space-y-8 lg:order-1">
          <div className="border border-border bg-card p-7">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="mt-2 h-0.5 w-10" />
            <Skeleton className="mt-6 h-4 w-40" />
            <Skeleton className="mt-3 h-10 w-36" />
            <Skeleton className="mt-6 h-12 w-full" />
          </div>
          <div className="hidden border border-border bg-card p-7 lg:block">
            <Skeleton className="h-6 w-32" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          </div>
        </aside>
        <article className="order-1 min-w-0 lg:order-2">
          <Skeleton className="h-8 w-4/5 sm:h-10" />
          <div className="mt-6">
            <Paragraph lines={5} />
          </div>
          <div className="mt-[35px] grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="aspect-4/3 w-full" />
            ))}
          </div>
          <Skeleton className="mt-[45px] h-8 w-64" />
          <div className="mt-6 grid gap-x-8 gap-y-5 min-[480px]:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-7 w-7 flex-none" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

/** Facility / service detail: banner, then the single editorial column. */
export function EditorialDetailSkeleton({ section }: { section: Section }) {
  return (
    <main className="flex-1">
      <BannerSkeleton section={section} />
      <article className="mx-auto w-full max-w-[966px] px-4 py-16 lg:px-3 lg:py-[120px]">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-8 w-11/12 sm:h-10 lg:w-4/5" />
        <Skeleton className="mt-5 h-11 w-52" />
        <Skeleton className="mt-[35px] aspect-video w-full" />
        <div className="mt-6">
          <Paragraph lines={6} />
        </div>
        <Skeleton className="mt-[45px] h-8 w-56" />
        <div className="mt-6 grid gap-x-8 gap-y-5 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-7 w-7 flex-none" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </article>
    </main>
  );
}

/** Checkout: banner, then the stay form beside the sticky summary card. */
export function BookingCheckoutSkeleton() {
  return (
    <main className="flex-1">
      <BannerSkeleton section="rooms" title="Book your stay" extraCrumb />
      <section className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 py-16 lg:grid-cols-[1fr_400px] lg:px-3 lg:py-[120px]">
        <div className="space-y-6">
          <Skeleton className="h-7 w-48" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
          <Skeleton className="h-7 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="border border-border bg-card p-6">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="mt-5 h-6 w-2/3" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-6 h-12 w-full" />
        </div>
      </section>
    </main>
  );
}
