// src/app/rooms/[slug]/book/loading.tsx
import { BookingCheckoutSkeleton } from '@/components/site/detail-skeletons';

/** Checkout is dynamic and money-facing - show progress, never a blank. */
export default function BookLoading() {
  return <BookingCheckoutSkeleton />;
}
