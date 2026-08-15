// src/lib/payments/verify-outcome.ts
//
// What the Paystack return page should actually tell the guest.
//
// A settled charge is NOT the same as a confirmed stay. When a payment
// lands after its hold lapsed, reconciliation either reseats the booking or
// refunds the money - and in the refund case the payment row is already
// REVERSED by the time the verify response is built. Branching on the raw
// payment status alone therefore tells a guest whose room was resold that
// their "payment was not confirmed", while a refund is quietly in flight.
// This maps the combined payment + booking state onto one explicit outcome
// so the client never has to infer it.

/** Statuses that mean the stay is not happening (money must not read as confirmed). */
const DEAD_BOOKING_STATUSES = new Set(['CANCELLED', 'EXPIRED', 'NO_SHOW']);

/** Statuses that mean the stay is genuinely secured. */
const SECURED_BOOKING_STATUSES = new Set([
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
]);

export type VerifyOutcome =
  /** Money in, stay is on. */
  | 'confirmed'
  /**
   * Money in, booking not yet finalised. Settlement and fulfilment are two
   * writes, so a failure between them leaves a paid booking still PENDING.
   * Calling that "confirmed" would promise a stay that the hold sweep may
   * still take away, so it gets its own honest state - the webhook retry
   * and the housekeeping sweep repair it behind the guest.
   */
  | 'processing'
  /** Money in, stay could not be honored, refund accepted by the provider. */
  | 'refunded'
  /** Money in, stay could not be honored, refund NOT yet completed - staff paged. */
  | 'refund_pending'
  /** Nothing settled (early return, abandoned checkout, failed charge). */
  | 'not_confirmed';

export interface IVerifyOutcomeInput {
  paymentStatus: string;
  booking: {
    status: string;
    refundedAmount: number;
    refundFailedAt: Date | string | null;
  } | null;
}

export function resolveVerifyOutcome({
  paymentStatus,
  booking,
}: IVerifyOutcomeInput): VerifyOutcome {
  if (paymentStatus === 'SUCCESS') {
    // Non-booking purposes have no stay to secure - settled is confirmed.
    if (!booking) return 'confirmed';
    // A dead booking still holding settled money means reconciliation could
    // not return it (no settled payment found to reverse) - never call that
    // confirmed.
    if (DEAD_BOOKING_STATUSES.has(booking.status)) return 'refund_pending';
    // Paid but not yet secured (fulfilment failed or is still in flight).
    return SECURED_BOOKING_STATUSES.has(booking.status)
      ? 'confirmed'
      : 'processing';
  }

  if (paymentStatus === 'REVERSED') {
    // Only claim the money is on its way back when the provider accepted
    // the refund; a failed refund is flagged and staffed, not completed.
    return booking && booking.refundedAmount > 0 && !booking.refundFailedAt
      ? 'refunded'
      : 'refund_pending';
  }

  return 'not_confirmed';
}
