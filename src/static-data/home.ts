// src/static-data/home.ts
//
// Editorial content for the landing page (not DB-driven): hero copy, the
// services trio, the facility feature rows, and footer hours. Kept as typed
// constants so copy edits never touch component code.
import {
  BellRing,
  CalendarCheck,
  Car,
  Dumbbell,
  Sparkles,
  UtensilsCrossed,
  Waves,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

/** Free Unsplash placeholder (hot-linkable) until real photos replace it. */
export const unsplash = (id: string, width = 1600): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

export const HERO = {
  eyebrow: 'Luxury Styled to Perfection',
  titleLine1: 'Where Elegance',
  titleLine2: 'Meets Comfort',
  blurb:
    'Boutique suites designed for rest and quiet luxury - book your stay directly and settle in.',
  image: unsplash('1618773928121-c32242e63f39', 2000),
} as const;

/** The Welcome section's overlapping photo pair. */
export const WELCOME_PHOTOS = {
  main: {
    src: '/images/cta-bg-1.jpg',
    alt: 'A calm, sunlit suite bedroom',
  },
  inset: {
    src: '/images/cta-bg-2.jpg',
    alt: 'Fresh towels and amenities laid out on a bed',
  },
} as const;

export interface ServiceItem {
  icon: LucideIcon;
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  /** Detail-page copy (paragraphs). */
  longDescription: string[];
  availability: string;
  /** Short feature bullets for the detail page's icon grid. */
  highlights: string[];
  image: { src: string; alt: string };
  /** Extra detail-page gallery shots. */
  gallery: { src: string; alt: string }[];
}

/** Guest services: homepage trio, /services rows, and detail pages. */
export const SERVICES: ServiceItem[] = [
  {
    icon: Sparkles,
    slug: 'daily-housekeeping',
    eyebrow: 'Fresh Daily',
    title: 'Daily Housekeeping',
    description:
      'Fresh linens and a spotless suite every day of your stay, on your schedule.',
    longDescription: [
      'Every suite is refreshed daily: beds made, linens and towels changed on your preferred rhythm, surfaces reset, and amenities topped up - all timed around your day, not ours.',
      'Hang the door card or tell the front desk when you would like the team in (or left out entirely). Deep cleans run between stays, so every arrival is to a spotless room.',
      'Laundry and pressing ride along with the same team - hand items in by 9 AM and they are back the same evening.',
    ],
    availability: 'Daily, timed around you',
    highlights: [
      'Fresh linens and towels',
      'Timed to your schedule',
      'Do-not-disturb respected',
      'Same-day laundry by 9 AM',
      'Deep clean between stays',
      'Eco-friendly products',
    ],
    image: {
      src: unsplash('1581578731548-c64695cc6952'),
      alt: 'A housekeeper resetting a bright suite',
    },
    gallery: [
      {
        src: unsplash('1584622650111-993a426fbf0a', 1200),
        alt: 'Fresh supplies ready for the day',
      },
    ],
  },
  {
    icon: Wifi,
    slug: 'fast-wifi',
    eyebrow: 'Always Connected',
    title: 'Fast Wi-Fi',
    description:
      'Reliable high-speed internet in every suite and every shared space.',
    longDescription: [
      'Fibre-backed Wi-Fi covers every suite, the Terrace, the pool deck, and the lobby - one network, one password, no portals to fight with.',
      'It holds up for what guests actually do: video calls, streaming, and large uploads, with enough headroom that a full house does not slow anyone down.',
      'Working a longer stay? Ask the desk about the quietest corners and the suites with the strongest signal - and wired access where you need absolute stability.',
    ],
    availability: '24/7, in every suite and space',
    highlights: [
      'Fibre-backed speeds',
      'One network everywhere',
      'Video-call reliable',
      'No login portals',
      'Streaming friendly',
      'Wired access on request',
    ],
    image: {
      src: unsplash('1497032628192-86f99bcd76bc', 1600),
      alt: 'A laptop and coffee by a bright window',
    },
    gallery: [
      {
        src: unsplash('1519389950473-47ba0277781c', 1200),
        alt: 'Guests working comfortably online',
      },
      {
        src: unsplash('1516387938699-a93567ec168e', 1200),
        alt: 'A tidy work corner in a suite',
      },
    ],
  },
  {
    icon: Car,
    slug: 'pickup-and-drop',
    eyebrow: 'Door To Door',
    title: 'Pickup & Drop',
    description:
      'Airport transfers and city rides, arranged at the front desk any time.',
    longDescription: [
      'Land, look for your name, and ride straight to the suites - airport pickups are arranged before you travel and tracked against your flight, so a delay never strands you.',
      'Around town, the desk books vetted drivers at fair, agreed-up-front fares: meetings, restaurants, markets, and the sights.',
      'Book your return drop at check-out and the car is waiting when you are - luggage handled, no negotiating at the curb.',
    ],
    availability: 'Any time - book at the front desk',
    highlights: [
      'Flight-tracked pickups',
      'Vetted drivers',
      'Fares agreed up front',
      'City rides on demand',
      'Luggage handled',
      'Return drops pre-booked',
    ],
    image: {
      src: unsplash('1449965408869-eaa3f722e40d', 1600),
      alt: 'A driver on an open road at dusk',
    },
    gallery: [
      {
        src: unsplash('1502877338535-766e1452684a', 1200),
        alt: 'A comfortable ride into the city',
      },
      {
        src: unsplash('1489824904134-891ab64532f1', 1200),
        alt: 'Planning the route to the suites',
      },
    ],
  },
];

export interface FacilityItem {
  icon: LucideIcon;
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  /** Detail-page copy (paragraphs). */
  longDescription: string[];
  openingHours: string;
  /** Short feature bullets for the detail page's icon grid. */
  highlights: string[];
  image: { src: string; alt: string };
  /** Extra detail-page gallery shots. */
  gallery: { src: string; alt: string }[];
}

/** The alternating image/text feature rows. */
export const FACILITIES: FacilityItem[] = [
  {
    icon: UtensilsCrossed,
    slug: 'terrace-restaurant',
    eyebrow: 'Our Food',
    title: 'The Terrace Restaurant',
    description:
      'Seasonal Ghanaian and continental plates, served from breakfast through dinner with a view over the courtyard.',
    longDescription: [
      'The Terrace is the heart of the house: an open, light-filled dining room that spills onto the courtyard, serving from first coffee to last dessert. The kitchen leans seasonal - Ghanaian staples done carefully beside continental favourites, with bread baked in-house every morning.',
      'Breakfast is included with select suites and served until 10:30. Lunch and dinner run à la carte, and the bar pours through the evening. Room service follows the same menu, delivered to your door.',
      'Tables for guests never need a reservation; for outside visitors and groups of six or more, call the front desk a day ahead.',
    ],
    openingHours: '6:30 AM - 10:00 PM',
    highlights: [
      'Breakfast included with select suites',
      'Fresh bread baked daily',
      'Full bar until late',
      'Room service to your door',
      'Courtyard terrace seating',
      'Vegetarian-friendly menu',
    ],
    image: {
      src: unsplash('1517248135467-4c7edcad34c4'),
      alt: 'Tables set for dinner in a warm restaurant',
    },
    gallery: [
      {
        src: unsplash('1414235077428-338989a2e8c0', 1200),
        alt: 'Terrace tables in the evening light',
      },
      {
        src: unsplash('1552566626-52f8b828add9', 1200),
        alt: 'The warm dining-room interior',
      },
      {
        src: unsplash('1559339352-11d035aa65de', 1200),
        alt: 'A freshly plated dish',
      },
    ],
  },
  {
    icon: BellRing,
    slug: 'front-desk',
    eyebrow: 'At Your Service',
    title: '24-Hour Front Desk',
    description:
      'Late arrival, early departure, a forgotten charger - the desk is staffed around the clock so nothing waits till morning.',
    longDescription: [
      'The desk never closes. Whether your flight lands at 3 AM or you need a taxi before sunrise, someone is there - checked in, checked out, and looked after at any hour.',
      'The team arranges airport transfers, city rides, laundry, printing, and local recommendations, and holds luggage before check-in or after check-out at no charge.',
      'Dial 0 from any suite phone, or stop by - the kettle in the lobby is always on.',
    ],
    openingHours: '24 hours',
    highlights: [
      'Staffed around the clock',
      'Airport transfers arranged',
      'Free luggage holding',
      'Laundry and pressing',
      'Local recommendations',
      'Dial 0 from any suite',
    ],
    image: {
      src: unsplash('1563911302283-d2bc129e7570'),
      alt: 'A welcoming hotel reception desk',
    },
    gallery: [
      {
        src: unsplash('1564501049412-61c2a3083791', 1200),
        alt: 'The hotel entrance at dusk',
      },
      {
        src: unsplash('1568084680786-a84f91d1153c', 1200),
        alt: 'The lobby lounge seating',
      },
      {
        src: unsplash('1551632436-cbf8dd35adfa', 1200),
        alt: 'A quiet corridor to the suites',
      },
    ],
  },
  {
    icon: Dumbbell,
    slug: 'fitness-studio',
    eyebrow: 'Stay Active',
    title: 'Fitness Studio',
    description:
      'A bright, fully equipped studio for morning routines, open to every guest from dawn to late evening.',
    longDescription: [
      'A compact but complete studio: free weights, resistance machines, treadmills and bikes, with tall windows that keep it bright from the first session of the day.',
      'Towels and filtered water are provided; headphones are yours to forget (we keep spares at the desk). The studio is included with every stay.',
      'Under-16s are welcome with an adult. If you want the room to yourself, the quietest hours are mid-morning and mid-afternoon.',
    ],
    openingHours: '5:00 AM - 10:00 PM',
    highlights: [
      'Free weights and machines',
      'Treadmills and bikes',
      'Towels and water provided',
      'Included with every stay',
      'Under-16s with an adult',
      'Quietest mid-morning',
    ],
    image: {
      src: unsplash('1534438327276-14e5300c3a48'),
      alt: 'Rows of equipment in a bright fitness studio',
    },
    gallery: [
      {
        src: unsplash('1540497077202-7c8a3999166f', 1200),
        alt: 'The weights corner of the studio',
      },
      {
        src: unsplash('1571019613454-1cb2f99b2d8b', 1200),
        alt: 'A morning stretch session',
      },
    ],
  },
  {
    icon: Waves,
    slug: 'pool-lounge',
    eyebrow: 'Unwind',
    title: 'Pool & Lounge',
    description:
      'A calm outdoor pool with shaded loungers - the slow afternoon you came for.',
    longDescription: [
      'The pool sits in the quietest corner of the property, ringed by shaded loungers and greenery. It is kept at a comfortable temperature year-round and lit softly after dark.',
      'The lounge serves drinks and light plates from the Terrace kitchen through the afternoon. Towels are at the stand - no need to bring your own.',
      'Children are welcome until 6 PM with an adult; evenings are kept adult-calm.',
    ],
    openingHours: '8:00 AM - 8:00 PM',
    highlights: [
      'Heated year-round',
      'Shaded loungers',
      'Towels at the stand',
      'Poolside drinks and plates',
      'Children until 6 PM',
      'Softly lit after dark',
    ],
    image: {
      src: unsplash('1571902943202-507ec2618e8f'),
      alt: 'An outdoor pool at golden hour',
    },
    gallery: [
      {
        src: unsplash('1572331165267-854da2b10ccc', 1200),
        alt: 'Loungers along the pool edge',
      },
      {
        src: unsplash('1560850038-f95de6e715b3', 1200),
        alt: 'The pool deck in the afternoon',
      },
      {
        src: unsplash('1561501878-aabd62634533', 1200),
        alt: 'The resort pool from above',
      },
    ],
  },
];

/** Room-detail editorial content (same for every room, template-style). */
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
    src: '/images/background-image-scroll.jpg',
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
  { label: 'Restaurant', value: '6:30 AM - 10:00 PM' },
  { label: 'Pool', value: '8:00 AM - 8:00 PM' },
  { label: 'Fitness studio', value: '5:00 AM - 10:00 PM' },
];
