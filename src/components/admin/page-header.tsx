// src/components/admin/page-header.tsx
import type { ReactNode } from 'react';

/**
 * The ONE admin page header - never per-page copies (they drift). Title
 * takes the full width and can wrap two lines; actions sit beside it only
 * from `sm` up and drop to their own row below (no width competition with
 * a long title on phones).
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  /** Right-side controls, aligned to the TITLE row only. */
  actions?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-foreground line-clamp-2 [overflow-wrap:anywhere]">
          {title}
        </h1>
        {actions && (
          <div className="flex flex-none flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
