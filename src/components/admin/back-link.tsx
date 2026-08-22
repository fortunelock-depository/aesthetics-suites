// src/components/admin/back-link.tsx
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Plain back link for detail pages: no border, no hover background,
 * underline on hover.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
