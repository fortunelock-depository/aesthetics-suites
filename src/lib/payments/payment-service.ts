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
 * Runs the post-settlement side effects for a settled payment. Safe to call
 * repeatedly: `markBookingPaid` is guarded by its own claim (PENDING + live
 * hold -> CONFIRMED) and its reconciliation fallback no-ops once the booking
 * is CONFIRMED/CHECKED_IN/CHECKED_OUT, so a replay does nothing.
 *
 * It is deliberately re-driven on the already-SUCCESS path too. Settlement
 * and fulfilment are two writes: if the claim commits and this then fails
 * (DB blip, transaction budget, the function being killed), the booking is
 * left PENDING while the payment reads SUCCESS. Without re-driving, every
 * later webhook retry and guest revisit would short-circuit on the settled
 * payment and the hold would simply expire under a guest who had paid.
 */
async function settleBookingFor(payment: Payment): Promise<void> {
  if (payment.purpose !== 'BOOKING' || !payment.purposeId) return;
  // Dynamic import: booking-service imports initializePayment from here,
  // so a static import would be a cycle.
  const { markBookingPaid } = await import('@/lib/hotel/booking-service');
  await markBookingPaid(payment.purposeId);
}

export interface IConfirmPaymentOptions {
  /**
   * Whether a post-settlement fulfilment failure reaches the caller.
   *
   * The webhook sets this so the route can answer 5xx and Paystack retries
   * the event - settlement is idempotent, so the retry re-drives fulfilment
   * and heals the gap on its own.
   *
   * The guest-facing verify route leaves it false: a fulfilment hiccup must
   * never tell someone who has just paid that their payment failed. Their
   * money is recorded either way, the outcome they are shown reflects the
   * real booking state, and the webhook retry plus the housekeeping sweep
   * repair the booking behind them.
   */
  propagateFulfilmentErrors?: boolean;
}

/**
 * Verifies a payment against Paystack and settles it idempotently. Returns
 * the (possibly already-settled) payment row.
 */
export async function confirmPayment(
  reference: string,
  options: IConfirmPaymentOptions = {},
): Promise<Payment> {
  const payment = await prisma.payment.findFirst({ where: { reference } });
  if (!payment) throw new NotFoundError('Payment not found');

  // Already settled: re-drive fulfilment rather than returning blind, so a
  // booking stranded by an earlier failure is repaired by this retry.
  if (payment.status === PaymentStatus.SUCCESS) {
    await runFulfilment(payment, options);
    return prisma.payment.findFirstOrThrow({ where: { id: payment.id } });
  }

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
  }
  // Run fulfilment whether or not this caller won the claim: the loser of a
  // verify-vs-webhook race would otherwise return while the winner is still
  // mid-fulfilment, and a repeat call is a no-op anyway.
  await runFulfilment(payment, options);

  return prisma.payment.findFirstOrThrow({ where: { id: payment.id } });
}

/**
 * Fulfilment wrapper enforcing the split described on
 * `IConfirmPaymentOptions`: the webhook wants the failure so Paystack
 * retries, the guest-facing verify path wants it logged and swallowed.
 */
async function runFulfilment(
  payment: Payment,
  options: IConfirmPaymentOptions,
): Promise<void> {
  try {
    await settleBookingFor(payment);
  } catch (error) {
    logger.error(
      { error, bookingId: payment.purposeId, reference: payment.reference },
      'Booking fulfilment after payment failed',
    );
    if (options.propagateFulfilmentErrors) throw error;
  }
}

export interface IReversalResult {
  payment: Payment;
  /** True only when Paystack actually accepted the refund call - callers
   * must not tell the guest money is coming unless this is true. */
  refunded: boolean;
  /**
   * True when this caller lost the reversal claim because something else
   * had already reversed the payment. Distinguishing it from a provider
   * rejection matters: a concurrent cancel and late-settle both try to
   * reverse, and the loser must not flag the booking as a failed refund
   * when the winner's refund is fine.
   */
  alreadyReversed: boolean;
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
  if (claim.count === 0) {
    // Never settled: nothing to reverse, and no reversal exists to report.
    if (payment.status !== PaymentStatus.REVERSED) return null;
    // Someone else already reversed it - report that rather than null, so
    // the caller does not mistake a concurrent success for a failure.
    return { payment, refunded: false, alreadyReversed: true };
  }

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
  return { payment: fresh, refunded, alreadyReversed: false };
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
  data: {
    reference?: string;
    /** Refund events carry the original charge's reference here. */
    transaction_reference?: string;
    /** Minor units. On a refund event this is the amount refunded. */
    amount?: number;
  };
}

/**
 * A refund executed on the Paystack dashboard (support escalation, dispute
 * settlement) never passes through `reversePayment`, so without this the
 * local ledger keeps reading SUCCESS while the money has gone back: the
 * room stays blocked for a stay nobody paid for and revenue is overstated.
 *
 * The guarded SUCCESS -> REVERSED claim makes a replayed event a no-op.
 */
async function applyProviderRefund(
  reference: string,
  refundedAmount?: number,
): Promise<void> {
  const payment =
    (await prisma.payment.findFirst({ where: { reference } })) ??
    (await prisma.payment.findFirst({
      where: { providerReference: reference },
    }));
  if (!payment) {
    logger.warn({ reference }, 'Webhook: refund for an unknown reference');
    return;
  }

  // A PARTIAL refund has no ledger representation here (our own refunds are
  // always full-amount), and flipping the whole payment REVERSED would
  // overstate the reversal and corrupt the booking totals. Page instead of
  // guessing.
  if (refundedAmount !== undefined && refundedAmount < payment.amount) {
    logger.error(
      { reference, refundedAmount, paymentAmount: payment.amount },
      'Partial provider-side refund - needs a manual ledger adjustment',
    );
    return;
  }

  const claim = await prisma.payment.updateMany({
    where: { id: payment.id, status: PaymentStatus.SUCCESS },
    data: { status: PaymentStatus.REVERSED, reversedAt: new Date() },
  });
  if (claim.count === 0) return; // replay, or never settled

  logger.warn(
    { reference, amount: payment.amount },
    'Provider-side refund applied to the ledger',
  );

  if (payment.purpose === 'BOOKING' && payment.purposeId) {
    await prisma.booking
      .update({
        where: { id: payment.purposeId },
        data: { refundedAmount: payment.amount },
      })
      .catch((error: unknown) =>
        logger.error(
          { error, bookingId: payment.purposeId },
          'Could not record a provider-side refund on the booking',
        ),
      );
  }
}

/**
 * Handles a verified webhook event. Throwing here makes the route return a
 * 5xx so Paystack retries; permanent (4xx) failures are swallowed so
 * Paystack stops retrying a charge that can never settle.
 */
export async function handleWebhookEvent(
  event: IPaystackWebhookEvent,
): Promise<void> {
  // A dispute needs a human (evidence, dashboard). Page, acknowledge, and
  // let the eventual refund event fix the ledger.
  if (event.event === 'charge.dispute.create') {
    const reference =
      event.data?.transaction_reference ?? event.data?.reference;
    logger.error({ reference }, 'Paystack dispute opened - needs attention');
    return;
  }

  if (event.event === 'refund.processed') {
    const reference =
      event.data?.transaction_reference ?? event.data?.reference;
    if (!reference) return;
    await applyProviderRefund(reference, event.data?.amount);
    return;
  }

  if (event.event !== 'charge.success') return;

  const reference = event.data?.reference;
  if (!reference) return;

  try {
    // The webhook is the retryable channel, so a fulfilment failure must
    // reach the route as a 5xx: Paystack retries, settlement is idempotent,
    // and the retry re-drives fulfilment instead of stranding a paid guest.
    await confirmPayment(reference, { propagateFulfilmentErrors: true });
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
    // Transient (Paystack unreachable, DB blip, fulfilment failure): rethrow
    // so the route returns 5xx and Paystack retries - otherwise a blip
    // strands a genuinely paid charge.
    throw error;
  }
}
