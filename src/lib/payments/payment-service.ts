// src/lib/payments/payment-service.ts
//
// The generic Paystack payment rail (khadys-kitchen ledger pattern):
//
// - `initializePayment` writes the PENDING ledger row FIRST, then calls
//   Paystack - so a settled charge can never arrive for an unknown reference.
//   A live PENDING charge for the same purpose is reused instead of starting
//   a second one (two tabs can't double-charge).
// - `confirmPayment` settles idempotently via a guarded updateMany claim, so
//   the verify-on-return call and the webhook can race safely.
// - Amount/currency mismatches are NEVER credited - they throw and are left
//   for manual review.
//
// When the booking domain lands, hook post-settlement side effects (marking
// the booking paid, confirmation email, public-page revalidation) into the
// `claimed` branch of confirmPayment.
import 'server-only';
import prisma, { PaymentStatus, type Payment } from '@/lib/prisma';
import {
  initializePaystackTransaction,
  refundPaystackTransaction,
  verifyPaystackTransaction,
} from '@/lib/paystack/client';
import { generatePaymentReference } from '@/utils/codes';
import { ENV } from '@/config/env';
import logger from '@/utils/logger';
import {
  BadRequestError,
  NotFoundError,
} from '@/lib/errors';

/** A still-usable PENDING checkout link is reused within this window. */
const REUSABLE_PENDING_PAYMENT_MS = 2 * 60 * 60 * 1000;

export interface IInitializePaymentInput {
  /** Minor units (pesewas). */
  amount: number;
  currency?: string;
  purpose: string;
  purposeId?: string;
  customerEmail: string;
  customerName?: string;
}

export interface IInitializePaymentResult {
  authorizationUrl: string;
  reference: string;
}

export async function initializePayment(
  input: IInitializePaymentInput,
): Promise<IInitializePaymentResult> {
  const currency = input.currency ?? 'GHS';

  // Reuse a live PENDING charge for the same purpose + amount instead of
  // opening a second Paystack transaction.
  const live = await prisma.payment.findFirst({
    orderBy: { createdAt: 'desc' },
    where: {
      purpose: input.purpose,
      purposeId: input.purposeId ?? null,
      customerEmail: input.customerEmail.toLowerCase().trim(),
      amount: input.amount,
      status: PaymentStatus.PENDING,
      authorizationUrl: { not: null },
      createdAt: { gte: new Date(Date.now() - REUSABLE_PENDING_PAYMENT_MS) },
    },
  });
  if (live?.authorizationUrl) {
    return { authorizationUrl: live.authorizationUrl, reference: live.reference };
  }

  const reference = generatePaymentReference();

  // PENDING ledger row first, then Paystack init.
  const payment = await prisma.payment.create({
    data: {
      reference,
      amount: input.amount,
      currency,
      purpose: input.purpose,
      purposeId: input.purposeId,
      customerEmail: input.customerEmail.toLowerCase().trim(),
      customerName: input.customerName,
    },
  });

  try {
    const init = await initializePaystackTransaction({
      email: payment.customerEmail,
      amount: payment.amount,
      currency,
      reference,
      callbackUrl: ENV.PAYSTACK_CALLBACK_URL ?? `${ENV.BASE_URL}/payments/verify`,
      metadata: { purpose: input.purpose, purposeId: input.purposeId ?? null },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        authorizationUrl: init.authorizationUrl,
        providerReference: init.reference,
      },
    });

    return { authorizationUrl: init.authorizationUrl, reference };
  } catch (error) {
    // Best-effort tidy - the row is meaningless without a checkout URL.
    await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    throw error;
  }
}

/**
 * Verifies a payment against Paystack and settles it idempotently. Returns
 * the (possibly already-settled) payment row.
 */
export async function confirmPayment(reference: string): Promise<Payment> {
  const payment = await prisma.payment.findFirst({ where: { reference } });
  if (!payment) throw new NotFoundError('Payment not found');

  // Idempotent short-circuit.
  if (payment.status === PaymentStatus.SUCCESS) return payment;

  // REVERSED/FAILED are terminal. Paystack keeps reporting a refunded charge
  // as "success", so without this guard a replayed webhook would flip a
  // refunded payment back to SUCCESS.
  if (payment.status !== PaymentStatus.PENDING) {
    throw new BadRequestError(
      'This payment can no longer be confirmed.',
      'PAYMENT_NOT_PENDING',
    );
  }

  const result = await verifyPaystackTransaction(reference);

  // Deliberately NOT marked FAILED - an early verify (user landed back
  // before paying) stays PENDING so a later webhook can still confirm.
  if (result.status !== 'success') {
    throw new BadRequestError(
      'This payment has not been completed.',
      'PAYMENT_NOT_COMPLETED',
    );
  }

  if (
    result.amount !== payment.amount ||
    result.currency.toUpperCase() !== payment.currency.toUpperCase()
  ) {
    logger.error(
      {
        reference,
        expected: { amount: payment.amount, currency: payment.currency },
        actual: { amount: result.amount, currency: result.currency },
      },
      'Paystack amount/currency mismatch - not crediting',
    );
    throw new BadRequestError(
      'This payment could not be reconciled. Please contact support.',
      'PAYMENT_MISMATCH',
    );
  }

  // Guarded claim: only ONE of the racing settlers (verify vs webhook)
  // transitions PENDING -> SUCCESS; the loser becomes a read-only no-op.
  const claim = await prisma.payment.updateMany({
    where: { id: payment.id, status: PaymentStatus.PENDING },
    data: {
      status: PaymentStatus.SUCCESS,
      paidAt: result.paidAt ? new Date(result.paidAt) : new Date(),
      providerReference: result.reference,
      channel: result.channel,
    },
  });

  if (claim.count > 0) {
    logger.info({ reference, amount: payment.amount }, 'Payment confirmed');
    // Post-settlement side effects run exactly once (the claim guards them).
    // Dynamic import: booking-service imports initializePayment from here,
    // so a static import would be a cycle.
    if (payment.purpose === 'BOOKING' && payment.purposeId) {
      const { markBookingPaid } = await import(
        '@/lib/hotel/booking-service'
      );
      await markBookingPaid(payment.purposeId).catch((error) =>
        logger.error(
          { error, bookingId: payment.purposeId },
          'Booking fulfilment after payment failed - fix manually',
        ),
      );
    }
  }

  return prisma.payment.findFirstOrThrow({ where: { id: payment.id } });
}

export interface IReversalResult {
  payment: Payment;
  /** True only when Paystack actually accepted the refund call - callers
   * must not tell the guest money is coming unless this is true. */
  refunded: boolean;
}

/**
 * Reverses a settled payment (cancellation refund). The SUCCESS -> REVERSED
 * claim happens FIRST so a crash after the flip can never re-credit; the
 * Paystack refund call follows outside any transaction (it's an external
 * API). A refund-call failure after the flip is reported to the caller
 * (refunded: false) so it can flag the booking for retry - the money-state
 * is conservative (marked reversed, guest not yet paid out) rather than
 * dangerous, but never silent.
 */
export async function reversePayment(
  paymentId: string,
  amount?: number,
): Promise<IReversalResult | null> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new NotFoundError('Payment not found');

  const claim = await prisma.payment.updateMany({
    where: { id: payment.id, status: PaymentStatus.SUCCESS },
    data: { status: PaymentStatus.REVERSED, reversedAt: new Date() },
  });
  if (claim.count === 0) return null; // already reversed / never settled

  let refunded = false;
  try {
    await refundPaystackTransaction(payment.reference, amount);
    refunded = true;
    logger.info(
      { reference: payment.reference, amount: amount ?? payment.amount },
      'Refund accepted by Paystack',
    );
  } catch (error) {
    logger.error(
      { error, reference: payment.reference },
      'Payment marked REVERSED but the Paystack refund call FAILED - flagged for retry',
    );
  }

  const fresh = await prisma.payment.findFirstOrThrow({
    where: { id: payment.id },
  });
  return { payment: fresh, refunded };
}

/** The settled payment backing a purpose row (e.g. a booking), if any. */
export async function findSettledPayment(
  purpose: string,
  purposeId: string,
): Promise<Payment | null> {
  return prisma.payment.findFirst({
    where: { purpose, purposeId, status: PaymentStatus.SUCCESS },
    orderBy: { paidAt: 'desc' },
  });
}

export interface IPaystackWebhookEvent {
  event: string;
  data: { reference?: string };
}

/**
 * Handles a verified webhook event. Throwing here makes the route return a
 * 5xx so Paystack retries; permanent (4xx) failures are swallowed so
 * Paystack stops retrying a charge that can never settle.
 */
export async function handleWebhookEvent(
  event: IPaystackWebhookEvent,
): Promise<void> {
  if (event.event !== 'charge.success') return;

  const reference = event.data?.reference;
  if (!reference) return;

  try {
    await confirmPayment(reference);
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status: unknown }).status)
        : 500;
    if (status < 500) {
      // Permanent: unknown reference, not-completed, mismatch. Acknowledge
      // so Paystack stops retrying.
      logger.warn({ reference, error }, 'Webhook settle skipped (permanent)');
      return;
    }
    // Transient (Paystack unreachable, DB blip): rethrow so the route
    // returns 5xx and Paystack retries - otherwise a blip strands a
    // genuinely paid charge as PENDING forever.
    throw error;
  }
}
