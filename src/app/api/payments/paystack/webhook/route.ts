// src/app/api/payments/paystack/webhook/route.ts
import { NextResponse } from 'next/server';
import { verifyPaystackSignature } from '@/lib/paystack/signature';
import {
  handleWebhookEvent,
  type IPaystackWebhookEvent,
} from '@/lib/payments/payment-service';
import logger from '@/utils/logger';

/**
 * Paystack webhook. The HMAC signature over the RAW body is the gate (this
 * route is unauthenticated by design). A 2xx acknowledges the event; a 5xx
 * makes Paystack retry - handleWebhookEvent decides which failures deserve
 * a retry.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  if (!verifyPaystackSignature(rawBody, signature)) {
    logger.warn('Paystack webhook rejected: invalid signature');
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
  }

  let event: IPaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  try {
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error({ error }, 'Paystack webhook settle failed (will retry)');
    return NextResponse.json({ message: 'Retry' }, { status: 500 });
  }
}
