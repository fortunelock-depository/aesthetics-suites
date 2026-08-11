// src/components/admin/detail-skeletons.tsx
import { Skeleton } from '@/components/ui/skeleton';

/** Header + stat tiles + content block, shaped like a typical detail page. */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-2/3 max-w-sm" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="grid gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-7 w-24" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1 min-[480px]:flex-row min-[480px]:justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
