// src/components/site/site-header.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { CtaLink } from './cta-link';
import { BrandLogo } from './brand-logo';
import { siteNavLinks, isActiveSiteLink, BOOK_NOW_HREF } from './nav-links';
import { MobileMenu } from './mobile-menu';

/**
 * Public navbar - the template's bar re-toned light: logo + wordmark left,
 * centered links, the square gold BOOK NOW right (121px bar, 1320px
 * container, 16px links, 16x43px button - measured from the reference).
 *
 * `variant="overlay"` reproduces the template's hero blending: the bar sits
 * FIXED over the hero with no background or border while the page is at the
 * top (the hero's imagery reads straight through it), then gains its solid
 * blurred background the moment you scroll. Pages without a hero use the
 * default solid sticky bar.
 */
export function SiteHeader({
  variant = 'solid',
}: {
  variant?: 'solid' | 'overlay';
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (variant !== 'overlay') return;
    const sync = () => setScrolled(window.scrollY > 8);
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    return () => window.removeEventListener('scroll', sync);
  }, [variant]);

  const transparent = variant === 'overlay' && !scrolled;

  return (
    <header
      className={cn(
        'top-0 z-40 transition-[background-color,border-color,box-shadow] duration-300',
        variant === 'overlay' ? 'fixed inset-x-0' : 'sticky',
        transparent
          ? 'border-b border-transparent bg-transparent'
          : 'border-b border-border bg-background/95 backdrop-blur',
      )}
    >
      <div className="relative mx-auto flex h-20 w-full max-w-[1320px] items-center justify-between gap-4 px-4 lg:h-[121px] lg:px-3">
        <BrandLogo />

        {/* Centered links from lg up (the template's desktop layout). */}
        <nav aria-label="Site" className="hidden lg:block">
          <ul className="flex items-center gap-10">
            {siteNavLinks.map((link) => {
              const active = isActiveSiteLink(link.href, pathname);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'text-base font-medium capitalize transition-colors hover:text-brand',
                      active ? 'text-brand-text' : 'text-foreground',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex flex-none items-center gap-3">
          <ThemeToggle className="h-10 w-10 border border-border text-foreground hover:bg-muted" />
          <CtaLink
            href={BOOK_NOW_HREF}
            sweep="light"
            className="hidden lg:inline-flex"
          >
            Book Now
          </CtaLink>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
