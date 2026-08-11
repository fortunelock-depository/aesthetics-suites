// src/components/admin/detail-skeletons.tsx
//
// Bespoke detail-page skeletons: each mirrors the exact page it stands in
// for (banner band + tabs + form, or the booking ledger), so the swap to
// real content barely moves anything.
import { Skeleton } from '@/components/ui/skeleton';

function HeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: actions }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </div>
      </div>
    </div>
  );
}

function TabsSkeleton({ tabs }: { tabs: number }) {
  return (
    <div
      className="grid gap-1 border-b border-border p-1"
      style={{ gridTemplateColumns: `repeat(${tabs}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: tabs }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

function FieldGridSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * The banner-band + tabs + form shape shared by the room, facility,
 * service and user detail pages. `band="avatar"` renders the round
 * profile photo instead of the rectangular cover.
 */
export function BandedDetailSkeleton({
  tabs = 2,
  band = 'photo',
  actions = 2,
}: {
  tabs?: number;
  band?: 'photo' | 'avatar';
  actions?: number;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <HeaderSkeleton actions={actions} />

      {/* Identity banner */}
      <div className="border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col items-center gap-5 bg-muted p-5 sm:flex-row">
          <Skeleton
            className={
              band === 'avatar'
                ? 'h-24 w-24 flex-none rounded-full'
                : 'h-24 w-32 flex-none'
            }
          />
          <div className="w-full max-w-xs space-y-2 text-center sm:text-left">
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-52 max-w-full" />
          </div>
        </div>
      </div>

      <TabsSkeleton tabs={tabs} />

      {/* Field grid card (the Details tab) */}
      <div className="border border-border bg-card p-4 sm:p-6">
        <FieldGridSkeleton />
        <div className="mt-5 flex justify-end">
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </div>
  );
}

function KeyValueRowsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 py-2.5"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Mirrors the booking detail: stay/guest cards, charges, payments. */
export function BookingDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <HeaderSkeleton actions={2} />

      <div className="grid gap-6 @3xl/main:grid-cols-2">
        {[7, 4].map((rows, i) => (
          <div key={i} className="border border-border bg-card p-4 sm:p-6">
            <Skeleton className="h-5 w-20" />
            <div className="mt-5">
              <KeyValueRowsSkeleton rows={rows} />
            </div>
          </div>
        ))}
      </div>

      {/* Charges */}
      <div className="border border-border bg-card p-4 sm:p-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-1 h-4 w-64 max-w-full" />
        <div className="mt-5">
          <KeyValueRowsSkeleton rows={4} />
        </div>
      </div>

      {/* Payments */}
      <div className="border border-border bg-card p-4 sm:p-6">
        <Skeleton className="h-5 w-24" />
        <div className="mt-5 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
