// src/components/site/mobile-menu.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CtaLink } from './cta-link';
import { siteNavLinks, isActiveSiteLink, BOOK_NOW_HREF } from './nav-links';

/**
 * Phone navigation: hamburger toggling a full-width panel under the header.
 * A plain disclosure (no portal) so the panel pushes content naturally and
 * closes on any link tap.
 */
export function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Standard disclosure dismissal: Escape closes, and so does a tap on the
  // page below the panel (pointerdown outside the component's subtree).
  //
  // Closing unmounts the panel, so whatever held focus disappears with it
  // and focus would fall to <body> - a keyboard user would restart from the
  // top of the document. Both paths hand focus back to the toggle, the
  // outside tap only when focus was inside the panel to begin with (a tap
  // elsewhere gets its own focus target from the browser).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (
        rootRef.current &&
        e.target instanceof Node &&
        !rootRef.current.contains(e.target)
      ) {
        const hadFocus = rootRef.current.contains(document.activeElement);
        setOpen(false);
        if (hadFocus) toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="lg:hidden">
      <button
        ref={toggleRef}
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
                      active ? 'text-brand-text' : 'text-foreground',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            {/* The tap lands on the button; the handler sits on the row
                so the panel closes on the way out. */}
            <li className="py-3" onClick={() => setOpen(false)}>
              <CtaLink href={BOOK_NOW_HREF} className="w-full justify-center">
                Book now
              </CtaLink>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
