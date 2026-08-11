// src/app/admin/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';
import { OverviewSkeleton } from '@/components/admin/skeletons';

export default function AdminLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <OverviewSkeleton />
    </section>
  );
}
