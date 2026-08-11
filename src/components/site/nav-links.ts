// src/components/site/nav-links.ts
//
// Public-site nav map. Sections not yet split into their own pages point at
// homepage anchors, so no link can 404; swap to real routes as pages land.
export interface SiteNavLink {
  href: string;
  label: string;
}

/** True when `pathname` is on this link's page (anchors never activate). */
export function isActiveSiteLink(href: string, pathname: string): boolean {
  if (href.includes('#')) return false;
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export const siteNavLinks: SiteNavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/rooms', label: 'Rooms' },
  { href: '/facilities', label: 'Facilities' },
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
];

/** The primary CTA target (the rooms catalogue until the booking flow lands). */
export const BOOK_NOW_HREF = '/rooms';
