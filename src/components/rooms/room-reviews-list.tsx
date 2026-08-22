// src/components/rooms/room-reviews-list.tsx
'use client';

import * as React from 'react';
import { BadgeCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Stars } from '@/components/ui/stars';
import { useGetRoomReviewsQuery } from '@/redux/reviews-api';
import { formatDate } from '@/lib/format-date';
import type { IPublicReviewItem } from '@/types/review.types';

function ReviewCard({ review }: { review: IPublicReviewItem }) {
  return (
    <li className="flex h-full flex-col border border-border bg-card p-6 lg:p-7">
      <div className="flex flex-col gap-1.5 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
        <Stars rating={review.rating} />
        <span className="flex-none text-xs text-muted-foreground">
          {formatDate(review.createdAt)}
        </span>
      </div>
      {review.title && (
        <p className="mt-3 font-heading text-[20px] leading-[1.3] font-normal tracking-[-0.01em] text-foreground [overflow-wrap:anywhere]">
          {review.title}
        </p>
      )}
      <p className="mt-2 flex-1 text-[15px] leading-[26px] text-muted-foreground [overflow-wrap:anywhere]">
        {review.body}
      </p>
      <p className="mt-4 border-t border-border pt-3.5 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
        {review.guestName}
        {review.verifiedStay && (
          <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-normal text-brand-text">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified stay
          </span>
        )}
      </p>
    </li>
  );
}

function CardSkeleton() {
  return (
    <li className="h-48 animate-pulse border border-border bg-card p-6">
      <div className="h-3.5 w-24 bg-muted" />
      <div className="mt-4 h-4 w-2/3 bg-muted" />
      <div className="mt-3 h-3 w-full bg-muted" />
      <div className="mt-2 h-3 w-5/6 bg-muted" />
    </li>
  );
}

/**
 * The paginated half of the reviews section. Page 1 arrives server-
 * rendered (SEO + instant paint); moving through pages fetches from
 * GET /api/rooms/[slug]/reviews - reviews grow without bound, so the
 * full set never ships to the client at once.
 */
export function RoomReviewsList({
  slug,
  initialReviews,
  totalCount,
  pageSize,
}: {
  slug: string;
  initialReviews: IPublicReviewItem[];
  totalCount: number;
  pageSize: number;
}) {
  const topRef = React.useRef<HTMLDivElement>(null);
  const [page, setPage] = React.useState(1);

  // Page 1 is already in hand from the server render - never refetched.
  const { data, isFetching, isError } = useGetRoomReviewsQuery(
    { slug, page, limit: pageSize },
    { skip: page === 1 },
  );

  const total = data?.pagination.totalItems ?? totalCount;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const reviews = page === 1 ? initialReviews : (data?.data ?? []);

  const goTo = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages));
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div ref={topRef} className="scroll-mt-28">
      <ul className="mt-8 grid gap-6 lg:grid-cols-2">
        {isFetching
          ? Array.from({ length: Math.min(pageSize, 4) }).map((_, i) => (
              <CardSkeleton key={i} />
            ))
          : reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
      </ul>

      {isError && page > 1 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Couldn&apos;t load this page of reviews - please try again.
        </p>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Reviews pages"
          className="mt-8 flex items-center justify-center gap-4"
        >
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1 || isFetching}
            aria-label="Previous reviews"
            className="grid h-11 w-11 place-items-center border border-border text-foreground transition-colors hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            Page{' '}
            <span className="font-medium text-foreground">{page}</span> of{' '}
            {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages || isFetching}
            aria-label="Next reviews"
            className="grid h-11 w-11 place-items-center border border-border text-foreground transition-colors hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
