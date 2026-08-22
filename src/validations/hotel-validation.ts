// src/validations/hotel-validation.ts
//
// Zod schemas for the hotel domain APIs. Frontend forms must mirror these:
// one contract, two enforcers.
import { z } from 'zod';
import { optionalPhoneField } from '@/validations/phone-validation';
import { isValidDateOnly, parseDateOnly } from '@/lib/hotel/dates';

export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  // The regex admits impossible dates ("2026-02-31" would silently roll
  // over to Mar 3 downstream); only real calendar dates pass.
  .refine(isValidDateOnly, 'Not a real calendar date');

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

// ── Room types ──────────────────────────────────────────────

export const roomTypeCreateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().min(20).max(10_000),
  /** Minor units per night. */
  basePrice: z.number().int().min(1),
  capacityAdults: z.number().int().min(1).max(20).default(2),
  capacityChildren: z.number().int().min(0).max(20).default(0),
  sizeSqm: z.number().int().min(1).max(10_000).optional(),
  amenities: z.array(z.string().trim().min(1).max(60)).max(50).default([]),
  faqs: z
    .array(
      z.object({
        question: z.string().trim().min(5).max(150),
        answer: z.string().trim().min(5).max(1000),
      }),
    )
    .max(12)
    .default([]),
  airbnbUrl: z.url().max(500).optional(),
  minNights: z.number().int().min(1).max(90).default(1),
  isPublished: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  /** Guests included in the nightly price. */
  baseOccupancy: z.number().int().min(1).max(20).default(2),
  /** Minor units per extra guest per night. */
  extraGuestFeePerNight: z.number().int().min(0).default(0),
  /** Full refund when cancelled at least this many days before check-in. */
  freeCancellationDays: z.number().int().min(0).max(60).default(2),
});

export const roomTypeUpdateSchema = roomTypeCreateSchema
  .partial()
  .extend({ airbnbUrl: z.url().max(500).nullable().optional() });

export const roomTypesQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().max(255).optional(),
  isPublished: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// ── Room units ──────────────────────────────────────────────

export const roomCreateSchema = z.object({
  roomTypeId: z.uuid(),
  name: z.string().trim().min(1).max(100),
  floor: z.string().trim().max(50).optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE']).default('ACTIVE'),
  notes: z.string().trim().max(500).optional(),
  airbnbIcalUrl: z.url().max(500).optional(),
});

export const roomUpdateSchema = roomCreateSchema
  .omit({ roomTypeId: true })
  .partial()
  .extend({ airbnbIcalUrl: z.url().max(500).nullable().optional() });

/** Link a unit owned by another listing so this one can sell it too. */
export const sharedUnitLinkSchema = z.object({
  roomId: z.uuid(),
});

export const roomsQuerySchema = z.object({
  ...pagination,
  roomTypeId: z.uuid().optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE']).optional(),
});

// ── Facilities ──────────────────────────────────────────────

export const facilityCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  eyebrow: z.string().trim().min(2).max(60),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().min(20).max(10_000),
  openingHours: z.string().trim().max(120).optional(),
  highlights: z.array(z.string().trim().min(2).max(60)).max(12).default([]),
  isPublished: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const facilityUpdateSchema = facilityCreateSchema
  .partial()
  .extend({ openingHours: z.string().trim().max(120).nullable().optional() })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nothing to update',
  });

export const facilitiesQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().max(255).optional(),
  isPublished: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// ── Services ────────────────────────────────────────────────

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  eyebrow: z.string().trim().min(2).max(60),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().min(20).max(10_000),
  availability: z.string().trim().max(120).optional(),
  highlights: z.array(z.string().trim().min(2).max(60)).max(12).default([]),
  isPublished: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const serviceUpdateSchema = serviceCreateSchema
  .partial()
  .extend({ availability: z.string().trim().max(120).nullable().optional() })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nothing to update',
  });

export const servicesQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().max(255).optional(),
  isPublished: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// ── Season rates & discounts ────────────────────────────────

export const seasonRateCreateSchema = z
  .object({
    roomTypeId: z.uuid(),
    name: z.string().trim().min(2).max(150),
    startDate: dateOnly,
    endDate: dateOnly,
    nightlyPrice: z.number().int().min(1),
    minNights: z.number().int().min(1).max(90).optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  });

export const seasonRateUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    startDate: dateOnly.optional(),
    endDate: dateOnly.optional(),
    nightlyPrice: z.number().int().min(1).optional(),
    minNights: z.number().int().min(1).max(90).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nothing to update',
  });

export const discountCreateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,50}$/, 'Letters, numbers, - and _ only')
      .optional(),
    name: z.string().trim().min(2).max(150),
    type: z.enum(['PERCENT', 'FIXED']),
    value: z.number().int().min(1),
    roomTypeId: z.uuid().optional(),
    startsAt: z.iso.datetime().optional(),
    endsAt: z.iso.datetime().optional(),
    minNights: z.number().int().min(1).max(90).optional(),
    maxUses: z.number().int().min(1).optional(),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.type !== 'PERCENT' || data.value <= 100, {
    message: 'Percent discounts cannot exceed 100',
    path: ['value'],
  });

export const discountUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    value: z.number().int().min(1).optional(),
    startsAt: z.iso.datetime().nullable().optional(),
    endsAt: z.iso.datetime().nullable().optional(),
    minNights: z.number().int().min(1).max(90).nullable().optional(),
    maxUses: z.number().int().min(1).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nothing to update',
  });

export const discountsQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().max(255).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// ── Bookings ────────────────────────────────────────────────

const stayFields = {
  checkIn: dateOnly,
  checkOut: dateOnly,
  adults: z.number().int().min(1).max(20).default(1),
  children: z.number().int().min(0).max(20).default(0),
};

/** Longest bookable stay - beyond this, talk to the hotel directly. */
export const MAX_STAY_NIGHTS = 90;
/** How far ahead a stay may begin: bots must not hold units decades out. */
export const MAX_BOOKING_HORIZON_MONTHS = 24;

// Zod v4 runs object-level refinements even when a field check already
// failed (issues accumulate), so these checks CAN see a string `dateOnly`
// rejected - they must pass such input through (returning true) and let the
// field's own issue surface, instead of letting parseDateOnly throw a
// RangeError out of .parse() as a 500.
const stayNights = {
  check: (data: { checkIn: string; checkOut: string }) =>
    !isValidDateOnly(data.checkIn) ||
    !isValidDateOnly(data.checkOut) ||
    (parseDateOnly(data.checkOut).getTime() -
      parseDateOnly(data.checkIn).getTime()) /
      86_400_000 <=
      MAX_STAY_NIGHTS,
  opts: {
    message: `Stays are limited to ${MAX_STAY_NIGHTS} nights - contact us for longer stays`,
    path: ['checkOut'],
  },
};
const stayHorizon = {
  check: (data: { checkIn: string }) => {
    if (!isValidDateOnly(data.checkIn)) return true; // dateOnly's issue wins
    const horizon = new Date();
    horizon.setUTCMonth(horizon.getUTCMonth() + MAX_BOOKING_HORIZON_MONTHS);
    return parseDateOnly(data.checkIn) <= horizon;
  },
  opts: {
    message: `Bookings open up to ${MAX_BOOKING_HORIZON_MONTHS} months ahead`,
    path: ['checkIn'],
  },
};

export const availabilityQuerySchema = z
  .object({
    checkIn: dateOnly,
    checkOut: dateOnly,
    adults: z.coerce.number().int().min(1).max(20).default(1),
    children: z.coerce.number().int().min(0).max(20).default(0),
    discountCode: z.string().trim().max(50).optional(),
  })
  .refine(stayNights.check, stayNights.opts)
  .refine(stayHorizon.check, stayHorizon.opts);

export const bookingCreateSchema = z
  .object({
    roomTypeSlug: z.string().trim().min(1).max(180),
    ...stayFields,
    guestName: z.string().trim().min(2).max(50),
    guestEmail: z.email(),
    /** Normalized to E.164 ("+233...") by the field itself. */
    guestPhone: optionalPhoneField,
    specialRequests: z.string().trim().max(1000).optional(),
    discountCode: z.string().trim().max(50).optional(),
    /** Honeypot - bots fill it, humans never see it. */
    website: z.string().max(0).optional(),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: 'checkOut must be after checkIn',
    path: ['checkOut'],
  })
  .refine(stayNights.check, stayNights.opts)
  .refine(stayHorizon.check, stayHorizon.opts);

export const manualBookingSchema = z
  .object({
    roomTypeId: z.uuid(),
    roomId: z.uuid().optional(),
    ...stayFields,
    guestName: z.string().trim().min(2).max(50),
    guestEmail: z.email(),
    /** Normalized to E.164 ("+233...") by the field itself. */
    guestPhone: optionalPhoneField,
    specialRequests: z.string().trim().max(1000).optional(),
    /**
     * Negotiated total in minor units. A discount off the quote only - the
     * service rejects anything above it, because the stored breakdown
     * carries the difference as `discountAmount` and cannot represent a
     * surcharge. Admin-only (the route gates FRONT_DESK out).
     */
    totalOverride: z.number().int().min(0).optional(),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: 'checkOut must be after checkIn',
    path: ['checkOut'],
  })
  .refine(stayNights.check, stayNights.opts)
  .refine(stayHorizon.check, stayHorizon.opts);

export const bookingsQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().max(255).optional(),
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'CHECKED_IN',
      'CHECKED_OUT',
      'CANCELLED',
      'NO_SHOW',
      'EXPIRED',
    ])
    .optional(),
  roomTypeId: z.uuid().optional(),
  /** Stays overlapping [from, to). */
  from: dateOnly.optional(),
  to: dateOnly.optional(),
});

export const bookingActionSchema = z.object({
  action: z.enum(['confirm', 'cancel', 'check_in', 'check_out', 'no_show']),
  reason: z.string().trim().max(500).optional(),
  /** cancel only: force a refund on / off, overriding the policy window. */
  refund: z.boolean().optional(),
});

export const calendarQuerySchema = z.object({
  from: dateOnly,
  to: dateOnly,
});

// ── Reviews ─────────────────────────────────────────────────

export const reviewCreateSchema = z.object({
  guestName: z.string().trim().min(2).max(50),
  guestEmail: z.email(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(150).optional(),
  body: z.string().trim().min(10).max(2000),
  /** Booking code - marks the review as a verified stay when it checks out. */
  bookingCode: z.string().trim().max(30).optional(),
  /** Honeypot. */
  website: z.string().max(0).optional(),
});

export const reviewsQuerySchema = z.object({
  ...pagination,
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  roomTypeId: z.uuid().optional(),
  /** Admin moderation queue only - matches guest name/email/title. */
  search: z.string().trim().max(255).optional(),
});

export const reviewModerateSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

// ── Contact ─────────────────────────────────────────────────

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter your name')
    .max(50, 'Name is too long'),
  email: z.email('Enter a valid email address'),
  /** Normalized to E.164 ("+233...") by the field itself. */
  phone: optionalPhoneField,
  subject: z.string().trim().max(120, 'Subject is too long').optional(),
  message: z
    .string()
    .trim()
    .min(10, 'Tell us a little more (at least 10 characters)')
    .max(2000, 'Message is too long'),
  /** Honeypot. */
  website: z.string().max(0).optional(),
  /** Cloudflare Turnstile response token (when Turnstile is configured). */
  turnstileToken: z.string().max(4096).optional(),
});
