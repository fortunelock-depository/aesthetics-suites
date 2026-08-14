// src/config/constants.ts

export const BCRYPT_SALT_ROUNDS = 12;

// Canonical URLs, the sitemap, and OG URLs are all built from this origin, so
// a production build without it would ship wrong metadata everywhere. Fail the
// build instead of falling back to a preview/localhost domain.
if (!process.env.NEXT_PUBLIC_BASE_URL && process.env.NODE_ENV === 'production') {
  throw new Error(
    'NEXT_PUBLIC_BASE_URL must be set in production (the public site origin, e.g. https://example.com).',
  );
}

export const SITE = {
  name: 'Aesthetics Suites',
  /** The logo's tagline. */
  tagline: 'Luxury Styled to Perfection',
  /** Full home-page title (the layout template's `default`). */
  title: 'Aesthetics Suites - Luxury Styled to Perfection',
  description:
    'Boutique hotel suites styled to perfection. Browse our rooms, check live availability, and book your stay online.',
  url: (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  ),
  locale: 'en_GH',
  /** Used by manifest.ts and the OG template. */
  themeColor: '#252A1C',
  backgroundColor: '#FFF9E2',
  keywords: [
    'Aesthetics Suites',
    'hotel suites',
    'luxury rooms',
    'boutique hotel',
    'book hotel online',
    'accommodation Ghana',
  ],
} as const;

export const CONTACT = {
  phone: '+233597143103',
  email: 'info@aestheticssuites.com',
  location: 'Tamale, Ghana',
  /** Map pin (central Tamale - adjust to the property). */
  map: { lat: 9.4008, lng: -0.8393 },
} as const;

/**
 * House check-in/check-out times. Stay dates are calendar dates in the
 * DB; these render beside them ("20 Jul 2026 · from 2:00 pm") wherever a
 * stay is displayed.
 */
export const STAY_TIMES = {
  checkInFrom: '2:00 pm',
  checkOutBy: '11:00 am',
} as const;
