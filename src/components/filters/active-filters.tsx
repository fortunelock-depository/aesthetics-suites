// src/components/filters/active-filters.tsx
'use client';

import * as React from 'react';
import { LucideIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * A single removable "active filter" chip. The caller decides when to render
 * it (i.e. only when that filter is set) and what label/icon to show.
 */
export function FilterChip({
  icon: Icon,
  children,
  onRemove,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 border border-brand/30 bg-brand/10 py-1 pl-2 pr-1.5 text-xs text-foreground sm:py-1.5 sm:pl-3 sm:pr-2"
    >
      {Icon && <Icon strokeWidth={1.5} className="h-3 w-3" />}
      <span className="max-w-30 truncate sm:max-w-50">{children}</span>
      <button
        type="button"
        aria-label="Remove filter"
        onClick={onRemove}
        className="ml-0.5 text-foreground/70 hover:text-foreground sm:ml-1"
      >
        <X strokeWidth={1.5} className="h-3 w-3" />
      </button>
    </Badge>
  );
}

/**
 * Wraps the row of active-filter chips with its label. Renders nothing when
 * there are no chips to show.
 */
export function ActiveFilters({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground sm:text-sm">
        Active:
      </span>
      {children}
    </div>
  );
}
