// src/components/ui/error-state.tsx
'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Wire to the query's `refetch` so the user can recover in place. */
  onRetry?: () => void;
}

/** Inline error panel for failed queries - pairs with extractApiError. */
export function ErrorState({
  title = "Couldn't load this",
  description = 'Something went wrong while fetching the data.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="border border-destructive/30 bg-destructive/5 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground [overflow-wrap:anywhere]">
        {description}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-4 gap-2" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
