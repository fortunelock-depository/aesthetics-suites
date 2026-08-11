// src/components/rooms/room-reviews.tsx
import { MessageSquareText, Star } from 'lucide-react';
import { SectionHeading } from '@/components/site/section-heading';
import { Reveal } from '@/components/site/reveal';
import { RoomReviewsList } from './room-reviews-list';
import { EmptyState } from '@/components/ui/empty-state';
import { WriteReviewButton } from './write-review-dialog';
import { REVIEWS_PAGE_SIZE } from '@/lib/hotel/public-room-detail';
import type { IPublicRoomDetail } from '@/lib/hotel/public-room-detail';

/**
 * Guest reviews at the bottom of the room detail page (the product
 * decision: reviews live under each listing). The heading and aggregate
 * render on the server; the list itself is server-PAGINATED through the
 * public API since reviews grow without bound.
 */
export function RoomReviews({
  slug,
  roomName,
  reviews,
  reviewsTotal,
  rating,
}: {
  slug: string;
  roomName: string;
  reviews: IPublicRoomDetail['reviews'];
  reviewsTotal: number;
  rating: IPublicRoomDetail['rating'];
}) {
  return (
    <section
      aria-label="Guest reviews"
      className="mx-auto w-full max-w-[1320px] px-4 pb-16 lg:px-3 lg:pb-[120px]"
    >
      <Reveal>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Testimonials" title="Guest Reviews" />
          {rating && (
            <p className="flex flex-none items-center gap-2 text-sm text-muted-foreground sm:pb-2">
              <Star className="h-4 w-4 fill-brand text-brand" />
              <span className="font-heading text-lg font-semibold text-foreground">
                {rating.average}
              </span>
              · {rating.count} review{rating.count === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </Reveal>

      {reviews.length === 0 ? (
        <EmptyState
              variant="site"
          icon={MessageSquareText}
          title="No reviews yet"
          description="Be the first to stay in this suite and tell us how it was."
          className="mt-8 py-10"
        />
      ) : (
        <RoomReviewsList
          slug={slug}
          initialReviews={reviews}
          totalCount={reviewsTotal}
          pageSize={REVIEWS_PAGE_SIZE}
        />
      )}

      {/* Stayed here? The dialog verifies via booking code. */}
      <div className="mt-10 flex justify-center">
        <WriteReviewButton slug={slug} roomName={roomName} />
      </div>
    </section>
  );
}
