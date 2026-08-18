// src/app/rooms/[slug]/loading.tsx
import { RoomDetailSkeleton } from '@/components/site/detail-skeletons';

/**
 * Room detail is dynamic (no generateStaticParams), so without this the
 * browser sits on the previous page until the server responds. Only the
 * page body is replaced - the navbar and footer live in rooms/layout.tsx.
 */
export default function RoomDetailLoading() {
  return <RoomDetailSkeleton />;
}
