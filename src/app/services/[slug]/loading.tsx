// src/app/services/[slug]/loading.tsx
import { EditorialDetailSkeleton } from '@/components/site/detail-skeletons';

/** Dynamic detail route - see rooms/[slug]/loading.tsx. */
export default function DetailLoading() {
  return <EditorialDetailSkeleton />;
}
