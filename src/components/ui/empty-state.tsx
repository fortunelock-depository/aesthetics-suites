// src/components/ui/empty-state.tsx
//
// No 'use client': this stays usable from Server Components (icon functions
// can't cross the server->client boundary). It becomes a client component
// automatically when imported from one (e.g. tables passing onCreateClick).
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Icon rendered above the title. */
  icon?: LucideIcon;
  /**
   * 'admin' (default) = the console's compact card; 'site' = the public
   * pages' display-font treatment. ONE component for every empty state.
   */
  variant?: 'admin' | 'site';
  className?: string;
  /** Primary call-to-action (e.g. "Add your first room"). */
  buttonText?: string;
  buttonIcon?: LucideIcon;
  onCreateClick?: () => void;
}

/**
 * Honest empty state for anything that resolved with no rows - never
 * leave a blank area where data was expected. With table-empty-logic this
 * renders ALONE (no toolbar/table) when a module has no data at all.
 */
export function EmptyState({
  title,
  description,
  icon: Icon,
  variant = 'admin',
  className,
  buttonText,
  buttonIcon: ButtonIcon,
  onCreateClick,
}: EmptyStateProps) {
  const site = variant === 'site';
  return (
    // A hairline over a quiet tint, never a dashed outline: dashes read as
    // a placeholder waiting to be built, and this state IS the finished UI.
    <div
      className={cn(
        'border border-border text-center',
        site ? 'bg-card px-6 py-14' : 'bg-muted/40 px-5 py-12',
        className,
      )}
    >
      {Icon &&
        (site ? (
          <Icon aria-hidden className="mx-auto mb-3 h-6 w-6 text-brand" />
        ) : (
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center border border-border bg-card text-muted-foreground">
            <Icon className="h-5 w-5" />
          </span>
        ))}
      <p
        className={cn(
          site
            ? 'font-heading text-2xl font-light tracking-[-0.01em] text-foreground'
            : 'text-sm font-semibold text-foreground',
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            'mx-auto text-muted-foreground',
            site
              ? 'mt-2 max-w-md text-[15px] leading-[26px]'
              : 'mt-1 max-w-sm text-sm',
          )}
        >
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
