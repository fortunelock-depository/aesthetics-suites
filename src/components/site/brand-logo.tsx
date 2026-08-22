// src/components/site/brand-logo.tsx
import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/config/constants';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

/**
 * The brand lockup for site chrome: the "A" mark beside the wordmark, the
 * icon-plus-name navbar arrangement. The wordmark is set in the sans face,
 * which is the geometric sans the logo art itself is drawn in - the display
 * serif beside that art read as two different brands. The mark is
 * theme-aware: the
 * dark variant sits on light surfaces and swaps for the light variant in dark
 * mode, where the dark mark would vanish into the background. `withTagline`
 * adds the logo's tagline underneath (footer).
 */
export function BrandLogo({
  withTagline = false,
  className,
}: {
  withTagline?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={routes.home}
      className={cn('inline-flex min-w-0 items-center gap-3', className)}
    >
      <Image
        src="/logo-mark-dark.png"
        alt=""
        width={44}
        height={40}
        className="h-10 w-auto flex-none dark:hidden"
        priority
      />
      <Image
        src="/logo-mark.png"
        alt=""
        width={44}
        height={40}
        className="hidden h-10 w-auto flex-none dark:block"
        priority
      />
      <span className="min-w-0">
        <span className="block truncate text-lg font-medium tracking-[0.01em] text-foreground lg:text-xl">
          {SITE.name}
        </span>
        {withTagline && (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {SITE.tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
