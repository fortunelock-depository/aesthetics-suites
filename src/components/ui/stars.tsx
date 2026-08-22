// src/components/ui/stars.tsx
import { Star } from 'lucide-react';

/**
 * The five-star rating row, shared by admin and public review views.
 *
 * The rating is a single image to assistive tech: aria-label on a bare span
 * is prohibited by ARIA (a generic element takes no name), so the label
 * rides a role="img" wrapper and the glyph row itself is hidden.
 */
export function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`${rating} out of 5`} className="inline-flex">
      <span aria-hidden className="flex items-center gap-0.5">
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
    </span>
  );
}
