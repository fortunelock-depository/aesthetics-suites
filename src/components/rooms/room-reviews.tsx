// src/components/rooms/room-reviews.tsx
import { BadgeCheck, MessageSquareText, Star } from 'lucide-react';
import { SectionHeading } from '@/components/site/section-heading';
import { Reveal } from '@/components/site/reveal';
import { formatDate } from '@/lib/format-date';
import type { IPublicRoomDetail } from '@/lib/hotel/public-room-detail';

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          key={step}
          className={
            step <= rating
              ? 'h-3.5 w-3.5 fill-brand text-brand'
              : 'h-3.5 w-3.5 text-border'
          }
        />
      ))}
    </span>
  );
}

/**
 * Guest reviews at the bottom of the room detail page (the product
 * decision: reviews live under each listing). Section heading in the house
 * style with the aggregate beside it; review cards two-up on desktop; an
 * honest empty line when the room has no approved reviews yet.
 */
export function RoomReviews({
  reviews,
  rating,
}: {
  reviews: IPublicRoomDetail['reviews'];
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
        <div className="mt-8 border border-dashed border-border bg-card px-6 py-10 text-center">
          <MessageSquareText className="mx-auto h-6 w-6 text-brand" />
          <p className="mt-3 text-[15px] text-muted-foreground">
            No reviews yet - be the first to stay in this suite and tell us
            how it was.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-6 lg:grid-cols-2">
          {reviews.map((review, index) => (
            <Reveal key={review.id} delay={Math.min(index, 3) * 0.08}>
              <li className="flex h-full flex-col border border-border bg-card p-6 lg:p-7">
                <div className="flex flex-col gap-1.5 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
                  <Stars rating={review.rating} />
                  <span className="flex-none text-xs text-muted-foreground">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                {review.title && (
                  <p className="mt-3 font-heading text-lg font-medium text-foreground [overflow-wrap:anywhere]">
                    {review.title}
                  </p>
                )}
                <p className="mt-2 flex-1 text-[15px] leading-[26px] text-muted-foreground [overflow-wrap:anywhere]">
                  {review.body}
                </p>
                <p className="mt-4 border-t border-dashed border-border pt-3.5 text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                  {review.guestName}
                  {review.verifiedStay && (
                    <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-normal text-brand">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified stay
                    </span>
                  )}
                </p>
              </li>
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}
