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
import 'server-only';
import prisma, {
  BookingStatus,
  BookingSource,
  type Booking,
} from '@/lib/prisma';
import { findAvailability, isUnitFree } from './availability';
import { computeQuote, discountApplies, type IDiscountInput } from './pricing';
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
  sendPreArrivalEmail,
  sendReviewInviteEmail,
} from '@/lib/mail/booking-emails';
import logger from '@/utils/logger';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '@/middlewares/error-handler';

const HOLD_MINUTES = 30;

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

  const taxFees = await prisma.taxFee.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { name: true, rateBps: true },
  });

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

  return { roomType, checkIn, checkOut, quote, discount, availability };
}

export interface ICreateBookingInput extends IBookingQuoteInput {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  specialRequests?: string;
}

/**
 * Public website booking: quote server-side, assign the first free unit,
 * create a PENDING hold and hand back the Paystack checkout URL.
 */
export async function createWebsiteBooking(input: ICreateBookingInput) {
  const { roomType, checkIn, checkOut, quote, discount, availability } =
    await quoteStay(input);

  if (!availability.unitId) {
    throw new ConflictError(
      'This room is fully booked for those dates. Try different dates.',
    );
  }

  const booking = await prisma.booking.create({
    data: {
      code: generateBookingCode(),
      roomTypeId: roomType.id,
      roomId: availability.unitId,
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
    },
  });

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
 * Settles a paid booking. Called from the payment rail's post-settlement
 * hook; the guarded claim keeps it idempotent under verify/webhook races.
 */
export async function markBookingPaid(bookingId: string): Promise<void> {
  const claim = await prisma.booking.updateMany({
    where: { id: bookingId, status: BookingStatus.PENDING },
    data: {
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(),
      holdExpiresAt: null,
    },
  });
  if (claim.count === 0) return;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { roomType: { select: { name: true } } },
  });
  if (!booking) return;

  if (booking.discountId) {
    await prisma.discount
      .update({
        where: { id: booking.discountId },
        data: { usedCount: { increment: 1 } },
      })
      .catch(() => {});
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

/** Staff-entered booking (walk-in/phone): created CONFIRMED, no payment. */
export async function createManualBooking(input: IManualBookingInput) {
  const roomType = await prisma.roomType.findFirst({
    where: { id: input.roomTypeId },
    include: { seasonRates: true },
  });
  if (!roomType) throw new NotFoundError('Room type not found');

  const checkIn = parseDateOnly(input.checkIn);
  const checkOut = parseDateOnly(input.checkOut);
  if (nightsBetween(checkIn, checkOut) < 1) {
    throw new BadRequestError('Check-out must be after check-in.');
  }

  let roomId = input.roomId ?? null;
  if (roomId) {
    if (!(await isUnitFree(roomId, checkIn, checkOut))) {
      throw new ConflictError('That unit is not free for those dates.');
    }
  } else {
    const availability = await findAvailability(roomType.id, checkIn, checkOut);
    if (!availability.unitId) {
      throw new ConflictError('No unit is free for those dates.');
    }
    roomId = availability.unitId;
  }

  const taxFees = await prisma.taxFee.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { name: true, rateBps: true },
  });
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
  const totalAmount = input.totalOverride ?? quote.totalAmount;

  return prisma.booking.create({
    data: {
      code: generateBookingCode(),
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
          ? Math.max(quote.totalAmount - totalAmount, 0)
          : quote.discountAmount,
      taxAmount: quote.taxAmount,
      taxBreakdown: quote.taxLines.map((line) => ({ ...line })),
      totalAmount,
      currency: roomType.currency,
      specialRequests: input.specialRequests,
      confirmedAt: new Date(),
    },
  });
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

export async function applyBookingAction(
  bookingId: string,
  action: BookingAction,
  reason?: string,
): Promise<Booking> {
  const transition = TRANSITIONS[action];
  const now = new Date();

  const claim = await prisma.booking.updateMany({
    where: { id: bookingId, status: { in: transition.from } },
    data: {
      status: transition.to,
      ...(action === 'confirm' && { confirmedAt: now, holdExpiresAt: null }),
      ...(action === 'cancel' && {
        cancelledAt: now,
        cancellationReason: reason,
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
}

/**
 * Cancels a booking under the room type's cancellation policy: a full
 * Paystack refund when cancelled at least `freeCancellationDays` before
 * check-in (or when staff force `refundOverride`), none otherwise. Sends
 * the guest a cancellation email either way.
 */
export async function cancelBookingWithPolicy(
  bookingId: string,
  opts: { reason?: string; refundOverride?: boolean } = {},
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
  );

  let refundedAmount = 0;
  if (wantRefund) {
    const payment = await findSettledPayment('BOOKING', bookingId);
    if (payment) {
      const reversed = await reversePayment(payment.id);
      if (reversed) {
        refundedAmount = payment.amount;
        await prisma.booking.update({
          where: { id: bookingId },
          data: { refundedAmount },
        });
      }
    }
  }

  void sendBookingCancelledEmail(
    cancelled,
    booking.roomType.name,
    refundedAmount,
  ).catch((error) =>
    logger.error({ error }, 'Booking cancellation email failed'),
  );

  return {
    booking: { ...cancelled, refundedAmount },
    refunded: refundedAmount > 0,
    refundedAmount,
  };
}

/**
 * Guest-facing cancellation: identified by booking code + email so a leaked
 * code alone cannot cancel a stay.
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
    select: { id: true },
  });
  if (!booking) throw new NotFoundError('Booking not found');
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
