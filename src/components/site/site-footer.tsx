// src/components/site/site-footer.tsx
import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { BrandLogo } from './brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { SocialCircles } from './social-circles';
import { SITE, CONTACT } from '@/config/constants';
import { OPENING_HOURS } from '@/static-data/home';
import { siteNavLinks } from './nav-links';
import { routes } from '@/lib/routes';

/**
 * Public footer - the reference's light footer: brand lockup + blurb +
 * social circles, quick links, contact column, opening-hours rows with
 * dotted leaders, then the bottom bar with legal links and the developer
 * credit (chosen-fintech style). `id="contact"` anchors the navbar's
 * Contact link.
 */
export function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-border bg-muted/50">
      <div className="mx-auto grid w-full max-w-[1320px] gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-3 lg:py-[90px]">
        {/* Brand */}
        <div>
          <BrandLogo withTagline />
          <p className="mt-4 max-w-xs text-[15px] leading-[26px] text-muted-foreground">
            {SITE.description}
          </p>
          <SocialCircles className="mt-5 flex items-center gap-3" />
        </div>

        {/* Quick links */}
        <nav aria-label="Footer">
          <h2 className="font-heading text-xl font-medium text-foreground">
            Quick Links
          </h2>
          <ul className="mt-5 space-y-3">
            {siteNavLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[15px] text-muted-foreground transition-colors hover:text-brand"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <div>
          <h2 className="font-heading text-xl font-medium text-foreground">
            Contact
          </h2>
          <ul className="mt-5 space-y-3.5 text-[15px] text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 flex-none text-brand" />
              <a
                href={`mailto:${CONTACT.email}`}
                className="min-w-0 transition-colors [overflow-wrap:anywhere] hover:text-brand"
              >
                {CONTACT.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 flex-none text-brand" />
              <a
                href={`tel:${CONTACT.phone}`}
                className="transition-colors hover:text-brand"
              >
                {CONTACT.phone}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 flex-none text-brand" />
              <span>{CONTACT.location}</span>
            </li>
          </ul>
        </div>

        {/* Opening hours - dotted-leader rows like the reference. */}
        <div>
          <h2 className="font-heading text-xl font-medium text-foreground">
            Opening Hours
          </h2>
          <ul className="mt-5 space-y-3.5">
            {OPENING_HOURS.map((row) => (
              <li
                key={row.label}
                className="flex items-baseline gap-2 border-b border-dashed border-border pb-2.5 text-[15px] last:border-0"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="min-w-4 flex-1" aria-hidden />
                <span className="text-right font-medium text-foreground">
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar: copyright + developer credit left, legal links right. */}
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row lg:px-3">
          <p className="text-center sm:text-left">
            <span className="block sm:inline">
              © {new Date().getFullYear()} {SITE.name}. All rights reserved.
            </span>{' '}
            <span className="hidden text-border sm:inline">|</span>{' '}
            <span className="mt-1 block sm:mt-0 sm:inline">
              Developed by{' '}
              <a
                href="https://manuru.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground transition-colors hover:text-brand hover:underline"
              >
                manuru
              </a>
            </span>
          </p>
          <div className="flex items-center gap-5">
            <nav aria-label="Legal" className="flex items-center gap-5">
              <Link
                href="/bookings"
                className="transition-colors hover:text-brand"
              >
                Manage Booking
              </Link>
              <Link
                href={routes.privacy}
                className="transition-colors hover:text-brand"
              >
                Privacy Policy
              </Link>
              <Link
                href={routes.terms}
                className="transition-colors hover:text-brand"
              >
                Terms of Service
              </Link>
            </nav>
            <ThemeToggle className="h-8 w-8 border border-border text-foreground hover:bg-muted" />
          </div>
        </div>
      </div>
    </footer>
  );
}
