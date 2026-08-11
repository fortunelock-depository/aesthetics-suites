// src/components/admin/detail-bits.tsx
//
// Shared building blocks for read-only detail views (profile, user detail,
// settings): the key/value row that stacks label-over-value on phones, and
// the titled section card.
import type { ReactNode } from 'react';

/** Key/value row: label above value on phones, side by side from 480px. */
export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-2.5 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
      <span className="flex-none text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 text-sm text-foreground [overflow-wrap:anywhere] min-[480px]:text-right">
        {children}
      </span>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  /** Right-side control on the title row (e.g. the Edit toggle). */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-none gap-2">{actions}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
