// src/app/api/payments/verify/route.ts
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma, { PaymentStatus, type Payment } from '@/lib/prisma';
import { confirmPayment } from '@/lib/payments/payment-service';
import { resolveVerifyOutcome } from '@/lib/payments/verify-outcome';
import { successResponse, handleApiError } from '@/utils/api-response';
import { ratelimit } from '@/lib/rate-limit';
import { clientIp } from '@/utils/client-ip';
import { TooManyRequestsError } from '@/lib/errors';

const verifySchema = z.object({
  reference: z.string().min(1).max(255),
});

/** True for the terminal-state refusal confirmPayment throws on a revisit. */
const isNotPending = (err: unknown): boolean =>
  Boolean(
    err &&
      typeof err === 'object' &&
      (err as { code?: unknown }).code === 'PAYMENT_NOT_PENDING',
  );

/**
 * Public verify endpoint the return page calls after Paystack redirects
 * back. Settlement is idempotent, so this and the webhook can race safely.
 * Rate-limited: every call costs a Paystack verify request, so an
 * unauthenticated caller must not get free API amplification.
 */
export async function POST(req: Request) {
  try {
    const ip = clientIp(await headers());
    const { success } = await ratelimit.limit(`payment-verify:${ip}`);
    if (!success) throw new TooManyRequestsError();

    const { reference } = verifySchema.parse(await req.json());

    let payment: Payment;
    try {
      payment = await confirmPayment(reference);
    } catch (err) {
      // Revisiting the return page after reconciliation already reversed
      // the charge: REVERSED is terminal, so confirmPayment refuses. From
      // the guest's side the money DID arrive and is being returned, so
      // report the same outcome the first visit did rather than a
      // misleading "not confirmed". Any other refusal still surfaces.
      const known = isNotPending(err)
        ? await prisma.payment.findFirst({ where: { reference } })
        : null;
      if (!known || known.status !== PaymentStatus.REVERSED) throw err;
      payment = known;
    }

    // A paid charge is not automatically a confirmed stay: the hold may
    // have lapsed and reconciliation may have refunded it. Return the
    // booking's post-settlement state so the return page tells the truth.
    let booking: {
      code: string;
      status: string;
      guestEmail: string;
      refunded: boolean;
      refundFailed: boolean;
    } | null = null;
    let bookingState: {
      status: string;
      refundedAmount: number;
      refundFailedAt: Date | null;
    } | null = null;

    if (payment.purpose === 'BOOKING' && payment.purposeId) {
      const row = await prisma.booking.findUnique({
        where: { id: payment.purposeId },
        select: {
          code: true,
          status: true,
          guestEmail: true,
          refundedAmount: true,
          refundFailedAt: true,
        },
      });
      if (row) {
        bookingState = {
          status: row.status,
          refundedAmount: row.refundedAmount,
          refundFailedAt: row.refundFailedAt,
        };
        booking = {
          code: row.code,
          status: row.status,
          guestEmail: row.guestEmail,
          refunded: row.refundedAmount > 0,
          refundFailed: row.refundFailedAt !== null,
        };
      }
    }

    return successResponse({
      reference: payment.reference,
      status: payment.status,
      // The single field the return page branches on - see verify-outcome.ts.
      outcome: resolveVerifyOutcome({
        paymentStatus: payment.status,
        booking: bookingState,
      }),
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt,
      booking,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
