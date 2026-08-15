// src/app/rooms/[slug]/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Room detail is dynamic (no generateStaticParams), so without this the
 * browser sits on the previous page until the server responds.
 */
export default function RoomDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-[280px] w-full sm:h-[420px]" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <Skeleton className="h-[320px] w-full" />
      </div>
    </div>
  );
}
