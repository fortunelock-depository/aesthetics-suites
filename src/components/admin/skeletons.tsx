// src/components/admin/skeletons.tsx
import { Skeleton } from '@/components/ui/skeleton';

/** Matches the OverviewClient stat-tile grid density. */
export function OverviewSkeleton() {
  return (
    <div className="grid gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-16" />
        </div>
      ))}
    </div>
  );
}
