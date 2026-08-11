// src/components/admin/skeletons.tsx
//
// Bespoke loading states shaped like the screens they stand in for, so
// the swap to real content barely moves anything.
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonRowCards } from '@/components/ui/table-bits';

function StatCardSkeleton() {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-8 w-24" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

function ListCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mirrors the full dashboard: filter, stat rows, cards, charts. */
export function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="max-w-[220px] space-y-1.5">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-8 w-full" />
      </div>

      {/* Headline + today's ops tiles */}
      {[0, 1].map((row) => (
        <div
          key={row}
          className="grid gap-3 min-[360px]:grid-cols-2 @3xl/main:grid-cols-4"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ))}

      <div className="grid gap-3 @3xl/main:grid-cols-2">
        <ListCardSkeleton rows={4} />
        <ListCardSkeleton rows={4} />
      </div>

      {/* Revenue chart: axis + rising bars */}
      <div className="min-w-0 rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-4 w-52" />
        <div className="mt-4 flex h-56 items-end gap-2 sm:gap-3">
          {[35, 55, 40, 70, 50, 80, 60, 90, 45, 75, 65, 85].map(
            (height, i) => (
              <Skeleton
                key={i}
                className="w-full"
                style={{ height: `${height}%` }}
              />
            ),
          )}
        </div>
      </div>

      {/* Breakdown charts: donut + legend, sources bar */}
      <div className="grid gap-3 @3xl/main:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-4 w-44" />
          <div className="mt-4 flex flex-col items-center gap-4 min-[480px]:flex-row">
            <Skeleton className="h-40 w-40 flex-none rounded-full" />
            <div className="w-full space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-2.5 w-2.5 flex-none" />
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="ml-auto h-4 w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="mt-4 h-3 w-full" />
          <div className="mt-4 space-y-2.5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5 flex-none" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="ml-auto h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 @3xl/main:grid-cols-2">
        <ListCardSkeleton rows={5} />
        <ListCardSkeleton rows={5} />
      </div>
    </div>
  );
}

/**
 * Suspense fallback for the admin list pages: toolbar, the dual-render
 * table shell (row cards below md, column bars from md), pagination.
 */
export function TablePageSkeleton({
  columns = 5,
  rows = 8,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-3">
      {/* Toolbar: search + inline filter/toggle */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 min-w-0 flex-1" />
        <Skeleton className="hidden h-8 w-44 sm:block lg:w-52" />
        <Skeleton className="h-8 w-10 sm:hidden" />
      </div>

      <div className="rounded-md border border-border">
        {/* Mobile: dense row cards */}
        <ul className="md:hidden">
          <SkeletonRowCards rows={rows} />
        </ul>
        {/* Desktop: header + column bars */}
        <div className="hidden md:block">
          <div
            className="grid gap-4 border-b border-border px-4 py-3"
            style={{
              gridTemplateColumns: `2fr repeat(${columns - 1}, 1fr)`,
            }}
          >
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-3/5" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid items-center gap-4 border-b border-border px-4 py-3 last:border-0"
              style={{
                gridTemplateColumns: `2fr repeat(${columns - 1}, 1fr)`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 flex-none" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              </div>
              {Array.from({ length: columns - 1 }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4 w-3/4" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* One-row pagination bar */}
      <div className="flex items-center justify-between gap-2 border border-border px-3 py-2.5">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}
