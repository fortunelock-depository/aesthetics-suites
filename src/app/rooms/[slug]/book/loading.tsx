// src/app/rooms/[slug]/book/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

/** Checkout is dynamic and money-facing - show progress, never a blank. */
export default function BookLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Skeleton className="h-8 w-56" />
      <div className="mt-8 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
