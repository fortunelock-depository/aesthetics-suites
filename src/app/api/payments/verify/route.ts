// src/app/api/payments/verify/route.ts
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { confirmPayment } from '@/lib/payments/payment-service';
import { successResponse, handleApiError } from '@/utils/api-response';
import { ratelimit } from '@/lib/rate-limit';
import { clientIp } from '@/utils/client-ip';
import { TooManyRequestsError } from '@/lib/errors';

const verifySchema = z.object({
  reference: z.string().min(1).max(255),
});

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
    const payment = await confirmPayment(reference);

    // A paid charge is not automatically a confirmed stay: the hold may
    // have lapsed and reconciliation may have refunded it. Return the
    // booking's post-settlement state so the return page tells the truth.
    let booking: {
      code: string;
      status: string;
      guestEmail: string;
      refunded: boolean;
    } | null = null;
    if (payment.purpose === 'BOOKING' && payment.purposeId) {
      const row = await prisma.booking.findUnique({
        where: { id: payment.purposeId },
        select: {
          code: true,
          status: true,
          guestEmail: true,
          refundedAmount: true,
        },
      });
      if (row) {
        booking = {
          code: row.code,
          status: row.status,
          guestEmail: row.guestEmail,
          refunded: row.refundedAmount > 0,
        };
      }
    }

    return successResponse({
      reference: payment.reference,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt,
      booking,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
