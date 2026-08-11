// src/components/site/mobile-menu.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { siteNavLinks, isActiveSiteLink, BOOK_NOW_HREF } from './nav-links';

/**
 * Phone navigation: hamburger toggling a full-width panel under the header.
 * A plain disclosure (no portal) so the panel pushes content naturally and
 * closes on any link tap.
 */
export function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Site"
          className="absolute inset-x-0 top-full border-b border-border bg-background shadow-sm"
        >
          <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
            {siteNavLinks.map((link) => {
              const active = isActiveSiteLink(link.href, pathname);
              return (
                <li
                  key={link.href}
                  className="border-b border-border last:border-0"
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'block py-3 text-sm font-medium',
                      active ? 'text-brand' : 'text-foreground',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li className="py-3">
              <Link
                href={BOOK_NOW_HREF}
                onClick={() => setOpen(false)}
                className="block bg-brand px-5 py-3 text-center text-sm font-semibold tracking-wide text-brand-foreground uppercase"
              >
                Book Now
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
