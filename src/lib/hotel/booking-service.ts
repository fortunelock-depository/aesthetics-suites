// src/lib/hotel/booking-service.ts
//
// Booking lifecycle:
//   WEBSITE:  PENDING (30-min hold) -> paid via Paystack -> CONFIRMED
//   MANUAL:   created CONFIRMED directly by staff (walk-in / phone)
//   then CONFIRMED -> CHECKED_IN -> CHECKED_OUT, or CANCELLED / NO_SHOW;
//   unpaid holds become EXPIRED via the housekeeping cron.
//
// Money is quoted server-side (pricing.ts) and denormalized onto the row so
// later rate changes never rewrite history.
//
// CONCURRENCY: every path that seats a booking (website checkout, manual
// entry, stale-hold confirm, paid-after-expiry resurrection) runs inside a
// transaction that takes a per-room-type advisory lock, sweeps that type's
// lapsed holds, and re-checks availability under the lock before writing.
// The DB-level exclusion constraint (Booking_no_unit_overlap, btree_gist)
// is the backstop for anything that slips past; the inline sweep keeps it
// honest, because the constraint cannot see holdExpiresAt.
import 'server-only';
import { cache } from 'react';
import prisma, {
  BookingStatus,
  BookingSource,
  Prisma,
  type Booking,
  type TransactionClient,
} from '@/lib/prisma';
import { findAvailability, isUnitFree } from './availability';
import { unitsSoldAs } from './units';
import {
  BOOKING_FETCH_TIMEOUT_MS,
  BOOKING_STALE_MS,
  refreshStaleCalendars,
} from './ical';
import {
  computeQuote,
  discountApplies,
  recomputeTaxForTotal,
  type IDiscountInput,
} from './pricing';
import { parseDateOnly, nightsBetween, todayUtc } from './dates';
import { generateBookingCode } from '@/utils/codes';
import {
  findSettledPayment,
  initializePayment,
  reversePayment,
} from '@/lib/payments/payment-service';
import {
  sendBookingConfirmedEmail,
  sendCompletePaymentEmail,
  sendBookingCancelledEmail,
  sendBookingNotificationToAdmins,
  sendPaymentReconciliationAlert,
  sendPreArrivalEmail,
  sendReviewInviteEmail,
} from '@/lib/mail/booking-emails';
import logger from '@/utils/logger';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '@/lib/errors';

const HOLD_MINUTES = 30;

/**
 * Active taxes/levies applied to every quote. The admin surface for
 * TaxFee was deliberately deferred (c6fb2c2) - rows are currently seeded
 * or SQL-managed - but the pricing pipeline stays wired so switching VAT
 * on is a data change, not a code change. request-cached so one checkout
 * does not query it twice.
 */
const getActiveTaxFees = cache(() =>
  prisma.taxFee.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { name: true, rateBps: true },
  }),
);


/** Seasons ordered so the FIRST overlap match wins = latest created. */
const SEASON_RATE_ORDER = { createdAt: 'desc' } as const;

/**
 * Seat transactions wait on the per-room-type advisory lock, and that wait
 * counts against the transaction timeout. Prisma's 5s default would turn a
 * burst of checkouts on one room type into P2028 aborts (a guest sees an
 * error where they should simply have queued), so seat work gets a wider
 * budget. Isolation stays READ COMMITTED - the lock, not the isolation
 * level, is what serializes assignment.
 */
const SEAT_TX_OPTIONS = { timeout: 15_000 } as const;

/**
 * Serializes unit assignment per room type. hashtext() gives a stable int4
 * from the uuid; the 'booking:' prefix domain-separates this lock from any
 * future advisory-lock use.
 */
async function lockRoomType(
  tx: TransactionClient,
  roomTypeId: string,
): Promise<void> {
  // ::text cast on the result: pg_advisory_xact_lock returns void, which
  // Prisma's $queryRaw cannot deserialize (it throws at runtime).
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('booking:' || ${roomTypeId})::bigint)::text`;
}

/**
 * Flips this room type's lapsed unpaid holds to EXPIRED inline, so the
 * exclusion constraint (which still counts them) matches what the
 * availability query (which does not) is about to report.
 */
async function sweepLapsedHolds(
  tx: TransactionClient,
  roomTypeId: string,
  excludeBookingId?: string,
): Promise<void> {
  await tx.booking.updateMany({
    where: {
      roomTypeId,
      status: BookingStatus.PENDING,
      holdExpiresAt: { lt: new Date() },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    data: { status: BookingStatus.EXPIRED },
  });
}

const isCodeCollision = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const { code, meta, message } = error as {
    code?: unknown;
    meta?: { target?: unknown };
    message?: unknown;
  };
  if (code !== 'P2002') return false;
  // meta.target is ['code'] with the classic engine but varies under driver
  // adapters - fall back to the stable message text ("... fields: (`code`)").
  return (
    String(meta?.target ?? '').includes('code') ||
    /\(`code`\)/.test(String(message ?? ''))
  );
};

/**
 * Creates the booking row, retrying with a fresh code on the (rare, ~3
 * random bytes per day-prefix) code collision instead of surfacing a 500.
 * Each attempt runs under a SAVEPOINT: Postgres aborts the surrounding
 * transaction on ANY statement error, so without one the retry itself
 * would fail with "current transaction is aborted" - the savepoint rolls
 * back just the failed insert while the advisory lock stays held.
 */
async function createBookingRow(
  tx: TransactionClient,
  data: Omit<Prisma.BookingUncheckedCreateInput, 'code'>,
): Promise<Booking> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    await tx.$executeRaw`SAVEPOINT booking_code_retry`;
    try {
      const booking = await tx.booking.create({
        data: { ...data, code: generateBookingCode() },
      });
      await tx.$executeRaw`RELEASE SAVEPOINT booking_code_retry`;
      return booking;
    } catch (error) {
      if (!isCodeCollision(error)) throw error;
      await tx.$executeRaw`ROLLBACK TO SAVEPOINT booking_code_retry`;
      lastError = error;
    }
  }
  throw lastError;
}

export interface IBookingQuoteInput {
  roomTypeSlug: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  discountCode?: string;
}

/** Loads the room type + resolves the quote and availability for a stay. */
export async function quoteStay(input: IBookingQuoteInput) {
  const checkIn = parseDateOnly(input.checkIn);
  const checkOut = parseDateOnly(input.checkOut);

  if (checkIn < todayUtc()) {
    throw new BadRequestError('Check-in cannot be in the past.');
  }
  if (nightsBetween(checkIn, checkOut) < 1) {
    throw new BadRequestError('Check-out must be after check-in.');
  }

  const roomType = await prisma.roomType.findFirst({
    where: { slug: input.roomTypeSlug, isPublished: true },
    include: {
      seasonRates: {
        where: { startDate: { lt: checkOut }, endDate: { gt: checkIn } },
        orderBy: SEASON_RATE_ORDER,
      },
    },
  });
  if (!roomType) throw new NotFoundError('Room not found');

  if (
    input.adults > roomType.capacityAdults ||
    input.children > roomType.capacityChildren
  ) {
    throw new BadRequestError(
      `This room sleeps up to ${roomType.capacityAdults} adult(s) and ${roomType.capacityChildren} child(ren).`,
    );
  }

  // Promo code (explicit) or best automatic promotion for this room type.
  let discount: IDiscountInput | null = null;
  if (input.discountCode) {
    discount = await prisma.discount.findFirst({
      where: {
        code: input.discountCode.toUpperCase().trim(),
        OR: [{ roomTypeId: null }, { roomTypeId: roomType.id }],
      },
    });
    if (
      !discount ||
      !discountApplies(discount, {
        nights: nightsBetween(checkIn, checkOut),
        now: new Date(),
      })
    ) {
      throw new BadRequestError('This promo code is not valid for this stay.');
    }
  } else {
    const automatics = await prisma.discount.findMany({
      where: {
        code: null,
        isActive: true,
        OR: [{ roomTypeId: null }, { roomTypeId: roomType.id }],
      },
    });
    const nights = nightsBetween(checkIn, checkOut);
    discount =
      automatics.find((candidate) =>
        discountApplies(candidate, { nights, now: new Date() }),
      ) ?? null;
  }

  const taxFees = await getActiveTaxFees();

  const quote = computeQuote({
    checkIn,
    checkOut,
    basePrice: roomType.basePrice,
    baseMinNights: roomType.minNights,
    seasonRates: roomType.seasonRates,
    discount,
    guests: input.adults + input.children,
    baseOccupancy: roomType.baseOccupancy,
    extraGuestFeePerNight: roomType.extraGuestFeePerNight,
    taxFees,
  });

  if (quote.nights < quote.minNights) {
    throw new BadRequestError(
      `This stay requires a minimum of ${quote.minNights} night(s).`,
    );
  }

  const availability = await findAvailability(roomType.id, checkIn, checkOut);

  return { roomType, checkIn, checkOut, quote, discount, availability, taxFees };
}

export interface ICreateBookingInput extends IBookingQuoteInput {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  specialRequests?: string;
}

/**
 * Public website booking: quote server-side, assign the first free unit,
 * create a PENDING hold and hand back the Paystack checkout URL. Unit
 * assignment happens under the room-type advisory lock with a fresh
 * availability check, so two concurrent checkouts can never seat the same
 * unit for overlapping dates.
 */
export async function createWebsiteBooking(input: ICreateBookingInput) {
  const { roomType, checkIn, checkOut, quote, discount, availability } =
    await quoteStay(input);

  // Friendly fast-path rejection; the locked re-check below is the truth.
  if (!availability.unitId) {
    throw new ConflictError(
      'This room is fully booked for those dates. Try different dates.',
    );
  }

  // Somebody is about to take this room, which is the one moment a stale
  // Airbnb calendar turns into a real double booking. Pull it now rather
  // than trusting a schedule: the locked availability re-check below reads
  // whatever blocks this imports, so the collision window shrinks from
  // "however long since the last sweep" to "seconds". It never blocks the
  // booking - refreshStaleCalendars swallows its own failures, and a
  // timeout just leaves us on the previously imported blocks.
  await refreshStaleCalendars(roomType.id, {
    maxAgeMs: BOOKING_STALE_MS,
    timeoutMs: BOOKING_FETCH_TIMEOUT_MS,
  });

  const booking = await prisma.$transaction(async (tx) => {
    await lockRoomType(tx, roomType.id);
    await sweepLapsedHolds(tx, roomType.id);

    const fresh = await findAvailability(roomType.id, checkIn, checkOut, tx);
    if (!fresh.unitId) {
      throw new ConflictError(
        'This room was just booked for those dates. Try different dates.',
      );
    }

    return createBookingRow(tx, {
      roomTypeId: roomType.id,
      roomId: fresh.unitId,
      guestName: input.guestName,
      guestEmail: input.guestEmail.toLowerCase().trim(),
      guestPhone: input.guestPhone,
      checkIn,
      checkOut,
      nights: quote.nights,
      adults: input.adults,
      children: input.children,
      status: BookingStatus.PENDING,
      source: BookingSource.WEBSITE,
      baseAmount: quote.baseAmount,
      occupancyAmount: quote.occupancyAmount,
      discountAmount: quote.discountAmount,
      taxAmount: quote.taxAmount,
      taxBreakdown: quote.taxLines.map((line) => ({ ...line })),
      totalAmount: quote.totalAmount,
      currency: roomType.currency,
      discountId: discount?.id,
      discountCode: discount?.code ?? undefined,
      specialRequests: input.specialRequests,
      holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
    });
  }, SEAT_TX_OPTIONS);

  try {
    const payment = await initializePayment({
      amount: booking.totalAmount,
      currency: booking.currency,
      purpose: 'BOOKING',
      purposeId: booking.id,
      customerEmail: booking.guestEmail,
      customerName: booking.guestName,
    });
    return { booking, ...payment };
  } catch (error) {
    // No checkout URL means the hold is pointless - free the unit now.
    await prisma.booking
      .delete({ where: { id: booking.id } })
      .catch(() => {});
    throw error;
  }
}

/**
 * Tries to seat a PENDING/EXPIRED booking again: keeps its own unit when
 * still free, otherwise moves it to any free sibling unit. Used when a
 * payment settles after the hold lapsed and when staff confirm a stale
 * hold. Returns true when the booking ended up CONFIRMED.
 */
async function tryReseatBooking(booking: {
  id: string;
  roomTypeId: string;
  roomId: string | null;
  checkIn: Date;
  checkOut: Date;
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    await lockRoomType(tx, booking.roomTypeId);
    await sweepLapsedHolds(tx, booking.roomTypeId, booking.id);

    let unitId: string | null = null;
    if (
      booking.roomId &&
      (await isUnitFree(booking.roomId, booking.checkIn, booking.checkOut, tx))
    ) {
      unitId = booking.roomId;
    } else {
      const alt = await findAvailability(
        booking.roomTypeId,
        booking.checkIn,
        booking.checkOut,
        tx,
      );
      unitId = alt.unitId;
    }
    if (!unitId) return false;

    const claim = await tx.booking.updateMany({
      where: {
        id: booking.id,
        status: { in: [BookingStatus.PENDING, BookingStatus.EXPIRED] },
      },
      data: {
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
        holdExpiresAt: null,
        roomId: unitId,
      },
    });
    return claim.count > 0;
  }, SEAT_TX_OPTIONS);
}

/**
 * A payment settled against a booking that is no longer a live PENDING
 * hold. Never keep the money silently: resurrect the stay when its dates
 * are still available, otherwise auto-refund and page the staff. Returns
 * true when the booking ended up CONFIRMED (caller then runs the normal
 * post-payment side effects).
 */
async function reconcileLatePayment(bookingId: string): Promise<boolean> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { roomType: { select: { name: true } } },
  });
  if (!booking) return false;

  // Already settled by the racing verify/webhook sibling - the winner ran
  // the side effects; this replay must stay a no-op.
  if (
    booking.status === BookingStatus.CONFIRMED ||
    booking.status === BookingStatus.CHECKED_IN ||
    booking.status === BookingStatus.CHECKED_OUT
  ) {
    return false;
  }

  const canResurrect =
    booking.status === BookingStatus.PENDING ||
    booking.status === BookingStatus.EXPIRED;

  if (canResurrect && (await tryReseatBooking(booking))) {
    logger.warn(
      { code: booking.code },
      'Late payment resurrected an expired hold - booking confirmed',
    );
    return true;
  }

  // Room gone (or booking cancelled): the guest paid for a stay we cannot
  // honor. Refund automatically and alert staff - this is an incident, not
  // a log line.
  const payment = await findSettledPayment('BOOKING', booking.id);
  let outcome: 'no_payment' | 'refund_failed' | 'refunded' = 'no_payment';
  if (payment) {
    const reversal = await reversePayment(payment.id);
    // `alreadyReversed` means a concurrent cancel beat us to it and its
    // refund stands - flagging that as failed would put a false
    // refundFailedAt on the dashboard for an admin to chase.
    outcome =
      reversal?.refunded || reversal?.alreadyReversed
        ? 'refunded'
        : 'refund_failed';
    if (outcome === 'refund_failed') {
      await prisma.booking
        .update({
          where: { id: booking.id },
          data: { refundFailedAt: new Date() },
        })
        .catch(() => {});
    } else if (outcome === 'refunded') {
      await prisma.booking
        .update({
          where: { id: booking.id },
          data: { refundedAmount: payment.amount, refundFailedAt: null },
        })
        .catch(() => {});
    }
  }

  logger.error(
    { code: booking.code, status: booking.status, outcome },
    'Payment settled against a dead booking - guest auto-refund attempted',
  );
  void sendPaymentReconciliationAlert(
    booking,
    booking.roomType.name,
    outcome,
  ).catch((error) =>
    logger.error({ error }, 'Payment reconciliation alert email failed'),
  );
  return false;
}

/**
 * Settles a paid booking. Called from the payment rail's post-settlement
 * hook; the guarded claim keeps it idempotent under verify/webhook races.
 * The claim only accepts a LIVE hold - a lapsed one goes through
 * reconciliation (reseat or refund) instead of silently confirming a stay
 * whose dates may have been resold.
 */
export async function markBookingPaid(bookingId: string): Promise<void> {
  const now = new Date();
  const claim = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      status: BookingStatus.PENDING,
      OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }],
    },
    data: {
      status: BookingStatus.CONFIRMED,
      confirmedAt: now,
      holdExpiresAt: null,
    },
  });

  if (claim.count === 0 && !(await reconcileLatePayment(bookingId))) return;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { roomType: { select: { name: true } } },
  });
  if (!booking) return;

  if (booking.discountId) {
    // Guarded raw increment: redemptions never exceed maxUses even under
    // concurrent settles (Prisma cannot compare two columns in a where).
    const incremented = await prisma.$executeRaw`
      UPDATE "Discount" SET "usedCount" = "usedCount" + 1
      WHERE "id" = ${booking.discountId}
        AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`.catch(
      (error: unknown) => {
        logger.error(
          { error, discountId: booking.discountId },
          'Discount usage increment failed',
        );
        return 0;
      },
    );
    if (incremented === 0) {
      // The cap was checked at quote time, so concurrent bookings on the
      // last redemption can both be honored while only one increments.
      // Refusing now is wrong (the guest has already paid) - the point is
      // that an over-redeemed code stops being invisible.
      logger.warn(
        { discountId: booking.discountId, bookingCode: booking.code },
        'Discount honored beyond its maxUses cap',
      );
    }
  }

  // The settling payment doubles the confirmation into a receipt.
  const payment = await prisma.payment.findFirst({
    where: { purpose: 'BOOKING', purposeId: bookingId, status: 'SUCCESS' },
    orderBy: { createdAt: 'desc' },
    select: {
      reference: true,
      amount: true,
      currency: true,
      channel: true,
      paidAt: true,
    },
  });

  // Fire-and-forget: mail failures never affect settlement.
  void sendBookingConfirmedEmail(
    booking,
    booking.roomType.name,
    payment ?? undefined,
  ).catch(
    (error) => logger.error({ error }, 'Booking confirmation email failed'),
  );
  void sendBookingNotificationToAdmins(booking, booking.roomType.name).catch(
    (error) => logger.error({ error }, 'Booking admin notification failed'),
  );
}

export interface IManualBookingInput {
  roomTypeId: string;
  roomId?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  specialRequests?: string;
  /** Override the computed total (negotiated walk-in price), minor units. */
  totalOverride?: number;
}

/**
 * Staff-entered booking (walk-in/phone): created CONFIRMED, no payment.
 * Enforces the same capacity/min-stay/past-date rules as the public path -
 * a walk-in is not exempt from physics - and stamps the acting user.
 */
export async function createManualBooking(
  input: IManualBookingInput,
  actorId: string,
) {
  const roomType = await prisma.roomType.findFirst({
    where: { id: input.roomTypeId },
    include: { seasonRates: { orderBy: SEASON_RATE_ORDER } },
  });
  if (!roomType) throw new NotFoundError('Room type not found');

  const checkIn = parseDateOnly(input.checkIn);
  const checkOut = parseDateOnly(input.checkOut);
  if (checkIn < todayUtc()) {
    throw new BadRequestError('Check-in cannot be in the past.');
  }
  if (nightsBetween(checkIn, checkOut) < 1) {
    throw new BadRequestError('Check-out must be after check-in.');
  }
  if (
    input.adults > roomType.capacityAdults ||
    input.children > roomType.capacityChildren
  ) {
    throw new BadRequestError(
      `This room sleeps up to ${roomType.capacityAdults} adult(s) and ${roomType.capacityChildren} child(ren).`,
    );
  }

  const taxFees = await getActiveTaxFees();
  const quote = computeQuote({
    checkIn,
    checkOut,
    basePrice: roomType.basePrice,
    baseMinNights: roomType.minNights,
    seasonRates: roomType.seasonRates,
    guests: input.adults + input.children,
    baseOccupancy: roomType.baseOccupancy,
    extraGuestFeePerNight: roomType.extraGuestFeePerNight,
    taxFees,
  });
  if (quote.nights < quote.minNights) {
    throw new BadRequestError(
      `This stay requires a minimum of ${quote.minNights} night(s).`,
    );
  }

  // A negotiated walk-in total is a DISCOUNT off the quote, never a
  // surcharge: the stored breakdown carries the difference in
  // `discountAmount` (clamped at zero), so an override above the quote
  // would leave base + occupancy - discount + tax disagreeing with
  // `totalAmount`. The schema cannot check this - it does not know the
  // quote - so it is enforced here.
  if (
    input.totalOverride !== undefined &&
    input.totalOverride > quote.totalAmount
  ) {
    throw new BadRequestError(
      `The override cannot exceed the quoted total of ${(quote.totalAmount / 100).toFixed(2)} ${roomType.currency}. Charge extras as a separate booking or service.`,
    );
  }

  const totalAmount = input.totalOverride ?? quote.totalAmount;
  // An overridden (negotiated) total changes the money actually collected,
  // so the frozen tax lines are re-derived from it - a VAT report summing
  // taxBreakdown must equal tax on real revenue, not on the list price.
  const tax =
    input.totalOverride !== undefined
      ? recomputeTaxForTotal(totalAmount, taxFees)
      : { taxAmount: quote.taxAmount, taxLines: quote.taxLines };

  return prisma.$transaction(async (tx) => {
    await lockRoomType(tx, roomType.id);
    await sweepLapsedHolds(tx, roomType.id);

    let roomId = input.roomId ?? null;
    if (roomId) {
      // The chosen unit must be sellable under this listing (owned by it or
      // shared into it) - a stale form must not seat a stay on a unit that
      // belongs to an unrelated room type.
      const sellable = await tx.room.findFirst({
        where: { id: roomId, ...unitsSoldAs(roomType.id) },
        select: { id: true },
      });
      if (!sellable) {
        throw new BadRequestError('That unit does not belong to this room type.');
      }
      if (!(await isUnitFree(roomId, checkIn, checkOut, tx))) {
        throw new ConflictError('That unit is not free for those dates.');
      }
    } else {
      const availability = await findAvailability(
        roomType.id,
        checkIn,
        checkOut,
        tx,
      );
      if (!availability.unitId) {
        throw new ConflictError('No unit is free for those dates.');
      }
      roomId = availability.unitId;
    }

    return createBookingRow(tx, {
      roomTypeId: roomType.id,
      roomId,
      guestName: input.guestName,
      guestEmail: input.guestEmail.toLowerCase().trim(),
      guestPhone: input.guestPhone,
      checkIn,
      checkOut,
      nights: quote.nights,
      adults: input.adults,
      children: input.children,
      status: BookingStatus.CONFIRMED,
      source: BookingSource.MANUAL,
      baseAmount: quote.baseAmount,
      occupancyAmount: quote.occupancyAmount,
      discountAmount:
        input.totalOverride !== undefined
          ? Math.max(
              quote.baseAmount +
                quote.occupancyAmount +
                tax.taxAmount -
                totalAmount,
              0,
            )
          : quote.discountAmount,
      taxAmount: tax.taxAmount,
      taxBreakdown: tax.taxLines.map((line) => ({ ...line })),
      totalAmount,
      currency: roomType.currency,
      specialRequests: input.specialRequests,
      confirmedAt: new Date(),
      createdById: actorId,
    });
  }, SEAT_TX_OPTIONS);
}

/** Allowed status transitions for staff actions. */
const TRANSITIONS: Record<string, { from: BookingStatus[]; to: BookingStatus }> =
  {
    confirm: {
      from: [BookingStatus.PENDING],
      to: BookingStatus.CONFIRMED,
    },
    cancel: {
      from: [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.CHECKED_IN,
      ],
      to: BookingStatus.CANCELLED,
    },
    check_in: {
      from: [BookingStatus.CONFIRMED],
      to: BookingStatus.CHECKED_IN,
    },
    check_out: {
      from: [BookingStatus.CHECKED_IN],
      to: BookingStatus.CHECKED_OUT,
    },
    no_show: {
      from: [BookingStatus.CONFIRMED],
      to: BookingStatus.NO_SHOW,
    },
  };

export type BookingAction = keyof typeof TRANSITIONS;

/**
 * Staff confirm of a PENDING booking. A live hold confirms directly; a
 * LAPSED hold no longer owns its dates, so it must re-prove availability
 * (reseat) first - otherwise a stale front-desk tab could confirm a
 * booking whose unit was resold while the hold sat expired.
 */
async function confirmPendingBooking(bookingId: string): Promise<Booking> {
  const now = new Date();
  const claim = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      status: BookingStatus.PENDING,
      OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }],
    },
    data: {
      status: BookingStatus.CONFIRMED,
      confirmedAt: now,
      holdExpiresAt: null,
    },
  });
  if (claim.count > 0) {
    return prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  }

  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
  });
  if (!existing) throw new NotFoundError('Booking not found');
  if (
    existing.status !== BookingStatus.PENDING &&
    existing.status !== BookingStatus.EXPIRED
  ) {
    throw new ConflictError(`Cannot confirm a ${existing.status} booking.`);
  }

  if (!(await tryReseatBooking(existing))) {
    throw new ConflictError(
      'The hold on this booking expired and its dates have since been taken. Create a new booking instead.',
    );
  }
  return prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
}

export async function applyBookingAction(
  bookingId: string,
  action: BookingAction,
  reason?: string,
  actorId?: string,
): Promise<Booking> {
  // Confirm re-proves availability for lapsed holds - see above.
  if (action === 'confirm') return confirmPendingBooking(bookingId);

  const transition = TRANSITIONS[action];
  const now = new Date();

  const claim = await prisma.booking.updateMany({
    where: { id: bookingId, status: { in: transition.from } },
    data: {
      status: transition.to,
      ...(action === 'cancel' && {
        cancelledAt: now,
        cancellationReason: reason,
        cancelledById: actorId,
      }),
      ...(action === 'check_in' && { checkedInAt: now }),
      ...(action === 'check_out' && { checkedOutAt: now }),
    },
  });

  if (claim.count === 0) {
    const existing = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true },
    });
    if (!existing) throw new NotFoundError('Booking not found');
    throw new ConflictError(
      `Cannot ${action.replace('_', ' ')} a ${existing.status} booking.`,
    );
  }

  return prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
}

export interface ICancellationResult {
  booking: Booking;
  refunded: boolean;
  refundedAmount: number;
  /** True when a due refund could NOT be executed at Paystack (flagged for retry). */
  refundFailed: boolean;
}

/**
 * Cancels a booking under the room type's cancellation policy: a full
 * Paystack refund when cancelled at least `freeCancellationDays` before
 * check-in (or when staff force `refundOverride`), none otherwise. Sends
 * the guest a cancellation email either way. A refund the provider
 * rejects is recorded on the booking (refundFailedAt) so the dashboard
 * surfaces it and staff can retry - never silently promised.
 */
export async function cancelBookingWithPolicy(
  bookingId: string,
  opts: {
    reason?: string;
    refundOverride?: boolean;
    actorId?: string;
  } = {},
): Promise<ICancellationResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      roomType: { select: { name: true, freeCancellationDays: true } },
    },
  });
  if (!booking) throw new NotFoundError('Booking not found');

  const msUntilCheckIn = booking.checkIn.getTime() - Date.now();
  const withinFreeWindow =
    msUntilCheckIn >=
    booking.roomType.freeCancellationDays * 24 * 60 * 60 * 1000;
  const wantRefund = opts.refundOverride ?? withinFreeWindow;

  const cancelled = await applyBookingAction(
    bookingId,
    'cancel',
    opts.reason ??
      (withinFreeWindow
        ? 'Cancelled within the free-cancellation window'
        : 'Cancelled outside the free-cancellation window'),
    opts.actorId,
  );

  let refundedAmount = 0;
  let refundFailed = false;
  if (wantRefund) {
    const payment = await findSettledPayment('BOOKING', bookingId);
    if (payment) {
      const reversal = await reversePayment(payment.id);
      // `alreadyReversed` means reconciliation (or another cancel) already
      // refunded this charge - record the money as returned rather than
      // silently telling the guest no refund applied.
      if (reversal?.refunded || reversal?.alreadyReversed) {
        refundedAmount = payment.amount;
        await prisma.booking.update({
          where: { id: bookingId },
          data: { refundedAmount, refundFailedAt: null },
        });
      } else if (reversal) {
        // Flip happened but Paystack rejected the payout - flag for retry;
        // refundedAmount stays 0 because no money has actually moved.
        refundFailed = true;
        await prisma.booking.update({
          where: { id: bookingId },
          data: { refundFailedAt: new Date() },
        });
      }
    }
  }

  void sendBookingCancelledEmail(
    cancelled,
    booking.roomType.name,
    refundedAmount,
    refundFailed,
  ).catch((error) =>
    logger.error({ error }, 'Booking cancellation email failed'),
  );

  return {
    booking: { ...cancelled, refundedAmount },
    refunded: refundedAmount > 0,
    refundedAmount,
    refundFailed,
  };
}

/**
 * Admin retry/late refund for a CANCELLED booking: re-drives a refund the
 * provider rejected (refundFailedAt set), or refunds a settled payment on
 * a booking cancelled without one (dispute resolution, goodwill).
 */
export async function refundCancelledBooking(
  bookingId: string,
): Promise<{ refundedAmount: number }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true, refundedAmount: true },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  if (booking.status !== BookingStatus.CANCELLED) {
    throw new ConflictError('Only cancelled bookings can be refunded here.');
  }
  if (booking.refundedAmount > 0) {
    throw new ConflictError('This booking has already been refunded.');
  }

  // Case 1: reversal already claimed, provider call failed - retry it.
  const reversed = await prisma.payment.findFirst({
    where: { purpose: 'BOOKING', purposeId: bookingId, status: 'REVERSED' },
    orderBy: { reversedAt: 'desc' },
  });
  if (reversed) {
    const { refundPaystackTransaction, isAlreadyRefunded } = await import(
      '@/lib/paystack/client'
    );
    try {
      await refundPaystackTransaction(reversed.reference);
    } catch (error) {
      // "Already refunded" is success wearing an error's clothes: the money
      // did go back, and only the local refundedAmount write failed last
      // time. Fall through and repair the row rather than leaving it
      // flagged forever with a refund Paystack has already paid.
      if (!isAlreadyRefunded(error)) {
        // Same clean, actionable 409 as the never-refunded branch below
        // instead of whatever status the provider client raises. The flag
        // stays set, so the dashboard keeps counting it for the next retry.
        logger.error(
          { error, bookingId, reference: reversed.reference },
          'Admin refund retry rejected by Paystack - still flagged',
        );
        throw new ConflictError(
          'Paystack rejected the refund - it stays flagged for retry.',
        );
      }
      logger.warn(
        { bookingId, reference: reversed.reference },
        'Paystack reports this charge already refunded - repairing the record',
      );
    }
    await prisma.booking.update({
      where: { id: bookingId },
      data: { refundedAmount: reversed.amount, refundFailedAt: null },
    });
    return { refundedAmount: reversed.amount };
  }

  // Case 2: payment still settled (cancelled without refund) - reverse now.
  const settled = await findSettledPayment('BOOKING', bookingId);
  if (!settled) {
    throw new ConflictError('No refundable payment exists for this booking.');
  }
  const reversal = await reversePayment(settled.id);
  if (!reversal?.refunded) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { refundFailedAt: new Date() },
    });
    throw new ConflictError(
      'Paystack rejected the refund - it stays flagged for retry.',
    );
  }
  await prisma.booking.update({
    where: { id: bookingId },
    data: { refundedAmount: settled.amount, refundFailedAt: null },
  });
  return { refundedAmount: settled.amount };
}

/**
 * Guest-facing cancellation: identified by booking code + email so a leaked
 * code alone cannot cancel a stay. Restricted to PENDING/CONFIRMED - an
 * in-house (CHECKED_IN) stay can only be cancelled by staff, otherwise the
 * calendar would show a physically occupied unit as free.
 */
export async function cancelBookingAsGuest(
  code: string,
  email: string,
): Promise<ICancellationResult> {
  const booking = await prisma.booking.findFirst({
    where: {
      code: code.toUpperCase().trim(),
      guestEmail: email.toLowerCase().trim(),
    },
    select: { id: true, status: true },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  if (
    booking.status !== BookingStatus.PENDING &&
    booking.status !== BookingStatus.CONFIRMED
  ) {
    throw new ConflictError(
      'This stay can no longer be cancelled online. Please contact the front desk.',
    );
  }
  return cancelBookingWithPolicy(booking.id, {
    reason: 'Cancelled by guest',
  });
}

const PRE_ARRIVAL_DAYS = 2;
const REVIEW_INVITE_WINDOW_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Housekeeping: sends due lifecycle emails exactly once each (the SentAt
 * markers are set BEFORE sending so a crash can skip an email but never
 * spam one).
 */
const PAYMENT_REMINDER_AFTER_MINUTES = 10;

export async function sendLifecycleEmails(): Promise<{
  reminders: number;
  reviewInvites: number;
  paymentReminders: number;
}> {
  const now = new Date();

  // Complete-your-payment nudges: holds still alive but unpaid for a
  // while (whatever the cron cadence, this fires while the hold lives).
  const dueNudges = await prisma.booking.findMany({
    where: {
      status: BookingStatus.PENDING,
      paymentReminderSentAt: null,
      holdExpiresAt: { gt: now },
      createdAt: {
        lte: new Date(
          now.getTime() - PAYMENT_REMINDER_AFTER_MINUTES * 60 * 1000,
        ),
      },
    },
    include: { roomType: { select: { name: true } } },
  });
  for (const booking of dueNudges) {
    // Marker BEFORE send - a crash mid-loop must never double-nudge.
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentReminderSentAt: now },
    });
    await sendCompletePaymentEmail(booking, booking.roomType.name).catch(
      (error) =>
        logger.error(
          { error, code: booking.code },
          'Complete-payment email failed',
        ),
    );
  }

  // Pre-arrival reminders: CONFIRMED stays checking in within N days.
  const dueReminders = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      reminderSentAt: null,
      checkIn: {
        gte: todayUtc(),
        lte: new Date(now.getTime() + PRE_ARRIVAL_DAYS * MS_PER_DAY),
      },
    },
    include: { roomType: { select: { name: true } } },
  });
  for (const booking of dueReminders) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reminderSentAt: now },
    });
    await sendPreArrivalEmail(booking, booking.roomType.name).catch((error) =>
      logger.error({ error, code: booking.code }, 'Pre-arrival email failed'),
    );
  }

  // Review invitations: recently checked-out stays.
  const dueInvites = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CHECKED_OUT,
      reviewInviteSentAt: null,
      checkedOutAt: {
        gte: new Date(now.getTime() - REVIEW_INVITE_WINDOW_DAYS * MS_PER_DAY),
      },
    },
    include: { roomType: { select: { name: true, slug: true } } },
  });
  for (const booking of dueInvites) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reviewInviteSentAt: now },
    });
    await sendReviewInviteEmail(
      booking,
      booking.roomType.name,
      booking.roomType.slug,
    ).catch((error) =>
      logger.error({ error, code: booking.code }, 'Review invite failed'),
    );
  }

  return {
    reminders: dueReminders.length,
    reviewInvites: dueInvites.length,
    paymentReminders: dueNudges.length,
  };
}

/**
 * Housekeeping safety net for the gap between settling a payment and
 * fulfilling its booking. Those are two writes: if the payment claim
 * commits and fulfilment then dies (DB blip, transaction budget, the
 * function being killed), the guest is charged while the booking sits
 * PENDING - and once its hold lapses it becomes EXPIRED and the unit is
 * resold under someone who paid.
 *
 * `confirmPayment` now re-drives fulfilment on every retry, so most gaps
 * close on the next webhook attempt. This sweep is the backstop for the
 * case where nothing retries at all, and guarantees repair within the hour.
 * `markBookingPaid` is the right repair for both states: a live hold is
 * claimed and confirmed, a lapsed one goes through reconciliation (reseat,
 * or refund and page the staff).
 */
export async function reconcileStrandedBookingPayments(): Promise<number> {
  // Raw join because `Payment.purposeId` is a deliberately generic string
  // rather than a relation, so Prisma cannot express "payments whose
  // booking is in these states" as a nested filter. Booking hard-deletes
  // (no deletedAt), so bypassing the soft-delete extension changes nothing.
  // Bounded so a backlog drains across runs instead of blowing the budget.
  const stranded = await prisma.$queryRaw<{ id: string }[]>`
    SELECT b."id"
    FROM "Booking" b
    JOIN "Payment" p ON p."purposeId" = b."id"
    WHERE p."purpose" = 'BOOKING'
      AND p."status" = 'SUCCESS'
      AND b."status" IN ('PENDING', 'EXPIRED')
    ORDER BY p."paidAt" ASC
    LIMIT 25`;

  let repaired = 0;
  for (const { id } of stranded) {
    try {
      await markBookingPaid(id);
      repaired++;
      logger.warn(
        { bookingId: id },
        'Swept a paid booking that was left unfulfilled',
      );
    } catch (error) {
      logger.error(
        { error, bookingId: id },
        'Could not reconcile a stranded paid booking',
      );
    }
  }
  if (repaired > 0) {
    logger.warn({ repaired }, 'Reconciled stranded paid bookings');
  }
  return repaired;
}

/** Housekeeping: flips lapsed unpaid holds to EXPIRED, freeing the unit. */
export async function expireStaleHolds(): Promise<number> {
  const result = await prisma.booking.updateMany({
    where: {
      status: BookingStatus.PENDING,
      holdExpiresAt: { lt: new Date() },
    },
    data: { status: BookingStatus.EXPIRED },
  });
  if (result.count > 0) {
    logger.info({ count: result.count }, 'Expired stale booking holds');
  }
  return result.count;
}
