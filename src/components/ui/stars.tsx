// src/components/ui/stars.tsx
import { Star } from 'lucide-react';

/** The five-star rating row, shared by admin and public review views. */
export function Stars({ rating }: { rating: number }) {
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
