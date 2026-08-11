// src/app/api/payments/verify/route.ts
import { z } from 'zod';
import { confirmPayment } from '@/lib/payments/payment-service';
import { successResponse, handleApiError } from '@/utils/api-response';

const verifySchema = z.object({
  reference: z.string().min(1).max(255),
});

/**
 * Public verify endpoint the return page calls after Paystack redirects
 * back. Settlement is idempotent, so this and the webhook can race safely.
 */
export async function POST(req: Request) {
  try {
    const { reference } = verifySchema.parse(await req.json());
    const payment = await confirmPayment(reference);

    return successResponse({
      reference: payment.reference,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
