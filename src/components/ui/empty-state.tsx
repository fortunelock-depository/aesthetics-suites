// src/components/ui/empty-state.tsx
//
// No 'use client': this stays usable from Server Components (icon functions
// can't cross the server->client boundary). It becomes a client component
// automatically when imported from one (e.g. tables passing onCreateClick).
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Icon rendered in the badge above the title. */
  icon?: LucideIcon;
  /** Primary call-to-action (e.g. "Add your first room"). */
  buttonText?: string;
  buttonIcon?: LucideIcon;
  onCreateClick?: () => void;
}

/**
 * Honest empty state for lists/queries that resolved with no rows - never
 * leave a blank area where data was expected. With table-empty-logic this
 * renders ALONE (no toolbar/table) when a module has no data at all.
 */
export function EmptyState({
  title,
  description,
  icon: Icon,
  buttonText,
  buttonIcon: ButtonIcon,
  onCreateClick,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border px-5 py-12 text-center">
      {Icon && (
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border border-border text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {buttonText && onCreateClick && (
        <Button className="mt-5 gap-2" onClick={onCreateClick}>
          {ButtonIcon && <ButtonIcon className="h-4 w-4" />}
          {buttonText}
        </Button>
      )}
    </div>
  );
}
