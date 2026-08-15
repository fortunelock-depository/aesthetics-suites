// src/app/facilities/[slug]/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

/** Dynamic detail route - see rooms/[slug]/loading.tsx. */
export default function DetailLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-[240px] w-full sm:h-[360px]" />
      <div className="mt-8 space-y-4">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/6" />
      </div>
    </div>
  );
}
