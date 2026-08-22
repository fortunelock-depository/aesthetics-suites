// src/static-data/home.ts
//
// Editorial content for the landing and room pages (not DB-driven): hero
// copy, section banner photos, check-in notes and footer hours. Kept as
// typed constants so copy edits never touch component code.
import { CalendarCheck } from 'lucide-react';
// Static imports (not string paths) so next/image can generate a blur
// placeholder at build time and knows the intrinsic size - the hero is the
// LCP element, and blurring up from a tone beats popping in from blank.
import heroOne from '../../public/images/hero-bg-1.webp';
import heroTwo from '../../public/images/hero-bg-2.webp';
import heroThree from '../../public/images/hero-bg-3.webp';
import heroFour from '../../public/images/hero-bg-4.webp';

/**
 * The inner-page banner photo per section. The list page AND every detail
 * page of a section share it (an item's own photos lead its gallery below),
 * so a detail route's loading skeleton can paint the exact banner the
 * finished page will have - no swap when the data lands.
 */
export const SECTION_BANNERS = {
  rooms: '/images/room-hero-bg.webp',
  facilities: '/images/facilities-bg.webp',
  services: '/images/services-bg.webp',
} as const;

export const HERO = {
  eyebrow: 'Luxury Styled to Perfection',
  titleLine1: 'Where Elegance',
  titleLine2: 'Meets Comfort',
  blurb:
    'Boutique suites designed for rest and quiet luxury - book your stay directly and settle in.',
  /**
   * Backdrop stills, cross-dissolved by HeroSlideshow. Order is the display
   * order. The CSS timeline in globals.css is written for exactly four -
   * adding or removing one means retiming those keyframes.
   */
  images: [heroOne, heroTwo, heroThree, heroFour],
} as const;

/** The Welcome section's overlapping photo pair. */
export const WELCOME_PHOTOS = {
  main: {
    src: '/images/cta-bg-1.webp',
    alt: 'A calm, sunlit suite bedroom',
  },
  inset: {
    src: '/images/cta-bg-2.webp',
    alt: 'Fresh towels and amenities laid out on a bed',
  },
} as const;

/** Room-detail editorial content (same for every room). */
export const ROOM_DETAILS_CONTENT = {
  checkInTitle: 'Special check-in instructions',
  checkInParagraphs: [
    'Check-in opens at 2:00 PM and check-out is by 12:00 noon. Bring the booking code from your confirmation email and a valid photo ID - that is all the front desk needs.',
    'Arriving early or leaving late? Tell the desk and we will hold your luggage at no charge, and offer early check-in or late check-out whenever the calendar allows. Airport transfers can be arranged any time by phone or email before you travel.',
  ],
  faqs: [
    {
      question: 'What documents are needed for check-in?',
      answer:
        'A valid photo ID (passport, national ID, or driving licence) and your booking code. The card or mobile-money account used to pay is never required at the desk.',
    },
    {
      question: 'Is my card charged before I check in?',
      answer:
        'Online bookings are paid in full at the time of booking through our secure checkout. Walk-in and phone reservations are settled at the front desk on arrival.',
    },
    {
      question: 'Can I cancel my booking?',
      answer:
        'Yes - every room states its free-cancellation window. Cancel before the window closes and the full amount is refunded to your original payment method automatically.',
    },
  ],
} as const;

export const VIDEO_BANNER = {
  icon: CalendarCheck,
  title: 'Book your suite online in minutes.',
  blurb: 'Live availability, instant confirmation, secure payment.',
  image: {
    src: '/images/background-image-scroll.webp',
    alt: 'The resort exterior and pool at dusk',
  },
} as const;

export interface OpeningHoursRow {
  label: string;
  value: string;
}

/** Footer "Opening Hours" column. */
export const OPENING_HOURS: OpeningHoursRow[] = [
  { label: 'Front desk', value: '24 hours' },
  { label: 'Pool', value: '7:00 AM - 10:00 PM' },
];
