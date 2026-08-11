// src/static-data/demo-rooms.ts
//
// Demo room content, shared by TWO consumers so they can never drift:
// - the landing page's static rooms grid (shown until the DB has rooms);
// - prisma/seed.ts (DEMO_SEED_ENABLED), which writes the same rooms to the
//   DB so the "real" grid looks identical once connected.
// Prices are minor units (pesewas); photos are free Unsplash placeholders
// (domain allowed in next.config.ts).
import { unsplash } from './home';
import type { IPublicRoomCard } from '@/lib/hotel/public-rooms';

export interface DemoRoomType {
  name: string;
  summary: string;
  description: string;
  basePrice: number;
  capacityAdults: number;
  capacityChildren: number;
  sizeSqm: number;
  amenities: string[];
  photo: { id: string; alt: string };
  units: string[];
}

const DEMO_RATINGS: { average: number; count: number }[] = [
  { average: 4.6, count: 18 },
  { average: 4.8, count: 32 },
  { average: 4.7, count: 21 },
  { average: 4.9, count: 40 },
  { average: 4.5, count: 12 },
];

export const DEMO_ROOM_TYPES: DemoRoomType[] = [
  {
    name: 'Standard Queen',
    summary:
      'A calm, comfortable queen room with everything a short stay needs.',
    description:
      'The Standard Queen is our essential suite: a plush queen bed, a bright work corner, and a walk-in shower. Quiet by design, with blackout curtains and soft lighting for real rest.',
    basePrice: 45_000,
    capacityAdults: 2,
    capacityChildren: 0,
    sizeSqm: 22,
    amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Room service'],
    photo: {
      id: '1631049307264-da0ec9d70304',
      alt: 'A tidy queen bedroom with soft light',
    },
    units: ['Suite 101', 'Suite 102'],
  },
  {
    name: 'Deluxe King',
    summary:
      'A spacious king room with a seating nook and garden-facing windows.',
    description:
      'The Deluxe King pairs a generous king bed with a reading nook, a rain shower, and windows over the garden courtyard. Ideal for couples and longer working stays.',
    basePrice: 65_000,
    capacityAdults: 2,
    capacityChildren: 1,
    sizeSqm: 30,
    amenities: [
      'Wi-Fi',
      'Air conditioning',
      'Smart TV',
      'Mini bar',
      'Room service',
    ],
    photo: {
      id: '1611892440504-42a792e24d32',
      alt: 'A deluxe king bedroom with warm bedside lighting',
    },
    units: ['Suite 201', 'Suite 202'],
  },
  {
    name: 'Family Twin',
    summary: 'Two full beds and room to spread out - built for families.',
    description:
      'The Family Twin sleeps four comfortably across two full beds, with extra wardrobe space and a family-sized bathroom. Cots are available on request.',
    basePrice: 80_000,
    capacityAdults: 2,
    capacityChildren: 2,
    sizeSqm: 36,
    amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Extra beds on request'],
    photo: {
      id: '1595576508898-0ad5c879a061',
      alt: 'A twin room with two made-up beds',
    },
    units: ['Suite 105', 'Suite 106'],
  },
  {
    name: 'Executive Suite',
    summary: 'A full suite with a separate lounge - our most requested stay.',
    description:
      'The Executive Suite gives you a separate living room, a dining corner, a king bedroom, and a deep soaking tub. Breakfast for two is included every morning.',
    basePrice: 110_000,
    capacityAdults: 2,
    capacityChildren: 2,
    sizeSqm: 48,
    amenities: [
      'Wi-Fi',
      'Air conditioning',
      'Smart TV',
      'Mini bar',
      'Bathtub',
      'Breakfast included',
    ],
    photo: {
      id: '1591088398332-8a7791972843',
      alt: 'An executive suite with a separate lounge area',
    },
    units: ['Suite 301'],
  },
  {
    name: 'Garden View Double',
    summary: 'A serene double opening onto the garden courtyard.',
    description:
      'The Garden View Double looks straight into the courtyard greenery, with a private terrace nook, a queen bed, and morning sun. The quietest corner of the house.',
    basePrice: 55_000,
    capacityAdults: 2,
    capacityChildren: 1,
    sizeSqm: 26,
    amenities: ['Wi-Fi', 'Air conditioning', 'Terrace', 'Room service'],
    photo: {
      id: '1590490360182-c33d57733427',
      alt: 'A bright double room with garden light',
    },
    units: ['Suite 103'],
  },
];

export interface DemoReview {
  guestName: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedStay: boolean;
  createdAt: string;
}

/** Static reviews per room (by index), shown until real reviews exist. */
export const DEMO_REVIEWS: DemoReview[][] = [
  [
    {
      guestName: 'Akosua M.',
      rating: 5,
      title: 'Quiet and spotless',
      body: 'Exactly what a short work trip needs - the bed is genuinely comfortable and the blackout curtains work. Housekeeping was in and out without me noticing.',
      verifiedStay: true,
      createdAt: '2026-07-18T09:00:00.000Z',
    },
    {
      guestName: 'Daniel O.',
      rating: 4,
      title: null,
      body: 'Great value for the price. Wi-Fi held up through video calls all day. Would have loved a bigger desk, but the corner setup did the job.',
      verifiedStay: true,
      createdAt: '2026-06-30T09:00:00.000Z',
    },
  ],
  [
    {
      guestName: 'Nana Yaa A.',
      rating: 5,
      title: 'The garden view is worth it',
      body: 'Waking up to the courtyard is lovely, and the rain shower is the best I have used in a hotel here. Breakfast at the Terrace rounded it off perfectly.',
      verifiedStay: true,
      createdAt: '2026-07-25T09:00:00.000Z',
    },
    {
      guestName: 'Kwame B.',
      rating: 5,
      title: null,
      body: 'Stayed five nights for work. The reading nook became my office and the room stayed cool all day. Staff remembered my name by day two.',
      verifiedStay: false,
      createdAt: '2026-07-02T09:00:00.000Z',
    },
    {
      guestName: 'Efua S.',
      rating: 4,
      title: 'Calm and comfortable',
      body: 'Beautiful room and very quiet at night. The mini bar was well stocked. Check-in took a few minutes longer than expected, but the welcome made up for it.',
      verifiedStay: true,
      createdAt: '2026-06-12T09:00:00.000Z',
    },
  ],
  [
    {
      guestName: 'The Mensah Family',
      rating: 5,
      title: 'Perfect with two kids',
      body: 'The two full beds and the extra wardrobe space made a week with children easy. The pool until 6 PM was the highlight of every day.',
      verifiedStay: true,
      createdAt: '2026-07-10T09:00:00.000Z',
    },
    {
      guestName: 'Adjoa K.',
      rating: 4,
      title: null,
      body: 'Spacious and bright. The cot for our youngest was ready before we arrived, which we appreciated. Bathroom comfortably fits the morning rush.',
      verifiedStay: true,
      createdAt: '2026-06-21T09:00:00.000Z',
    },
  ],
  [
    {
      guestName: 'Kofi & Ama',
      rating: 5,
      title: 'Our anniversary stay',
      body: 'The separate lounge makes it feel like a small apartment, and the soaking tub is glorious. Breakfast for two every morning was generous and unhurried.',
      verifiedStay: true,
      createdAt: '2026-08-01T09:00:00.000Z',
    },
    {
      guestName: 'Yaw D.',
      rating: 5,
      title: 'Best room in the house',
      body: 'Hosted my parents here for a weekend. The dining corner meant we could eat together in the room. Worth every pesewa.',
      verifiedStay: true,
      createdAt: '2026-07-14T09:00:00.000Z',
    },
  ],
  [
    {
      guestName: 'Abena T.',
      rating: 5,
      title: 'The quiet corner',
      body: 'The terrace nook with morning sun is everything the description promises. I read there every morning with coffee from the Terrace.',
      verifiedStay: true,
      createdAt: '2026-07-22T09:00:00.000Z',
    },
    {
      guestName: 'Samuel N.',
      rating: 4,
      title: null,
      body: 'Lovely garden outlook and truly quiet. The queen bed is on the softer side, which I like. Would book again for a weekend reset.',
      verifiedStay: false,
      createdAt: '2026-06-28T09:00:00.000Z',
    },
  ],
];

/** The demo rooms shaped like the DB-backed card payload (for the grid). */
export const DEMO_ROOM_CARDS: IPublicRoomCard[] = DEMO_ROOM_TYPES.map(
  (room, index) => ({
    id: `demo-${index}`,
    name: room.name,
    slug: room.name.toLowerCase().replace(/\s+/g, '-'),
    summary: room.summary,
    basePrice: room.basePrice,
    currency: 'GHS',
    capacityAdults: room.capacityAdults,
    capacityChildren: room.capacityChildren,
    sizeSqm: room.sizeSqm,
    unitCount: room.units.length,
    coverPhoto: { url: unsplash(room.photo.id, 1200), alt: room.photo.alt },
    rating: DEMO_RATINGS[index] ?? null,
  }),
);
