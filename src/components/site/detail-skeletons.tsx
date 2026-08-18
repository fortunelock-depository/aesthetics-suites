// src/components/site/detail-skeletons.tsx
//
// Loading states for the public detail routes. Each mirrors the page it
// stands in for (banner band, then that page's own content shape) and is
// rendered inside the section layout, so the navbar and footer stay put
// while the page streams in.
import { Skeleton } from '@/components/ui/skeleton';

/** The dark PageBanner band with a centred title + breadcrumb. */
export function BannerSkeleton() {
  return (
    <div className="flex min-h-[280px] w-full flex-col items-center justify-center bg-[#0E1317]/85 px-4 py-16 lg:min-h-[330px]">
      <Skeleton className="h-9 w-56 bg-white/15 lg:h-14 lg:w-96" />
      <Skeleton className="mt-4 h-4 w-40 bg-white/10" />
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
      <BannerSkeleton />
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
export function EditorialDetailSkeleton() {
  return (
    <main className="flex-1">
      <BannerSkeleton />
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
      <BannerSkeleton />
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
