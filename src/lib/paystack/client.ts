// src/lib/paystack/client.ts
//
// Thin Paystack REST client. Server-side secret-key + redirect flow only
// (no inline popup, no public key in the browser): we initialize a
// transaction, send the guest to `authorization_url`, and settle via
// verify + webhook. All amounts are integer minor units (pesewas).
import 'server-only';
import { ENV } from '@/config/env';
import { CustomError } from '@/lib/errors';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const REQUEST_TIMEOUT_MS = 20_000;

export interface IPaystackInitParams {
  email: string;
  /** Minor units (pesewas for GHS). */
  amount: number;
  currency?: string;
  /** Our reference - the idempotency key Paystack echoes back. */
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface IPaystackInitResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface IPaystackVerifiedTransaction {
  /** "success" | "failed" | "abandoned" | ... - a non-success status is a
   * valid result the caller handles, not an error. */
  status: string;
  /** Minor units. */
  amount: number;
  currency: string;
  reference: string;
  paidAt: string | null;
  channel: string | null;
  customerEmail: string | null;
}

function requireSecretKey(): string {
  if (!ENV.PAYSTACK_SECRET_KEY) {
    throw new CustomError(
      500,
      'Payments are not configured (missing Paystack secret key).',
    );
  }
  return ENV.PAYSTACK_SECRET_KEY;
}

/**
 * Calls Paystack with a timeout, reading text first so a non-JSON gateway
 * error page produces a clear error instead of a JSON.parse crash.
 */
async function paystackRequest(
  path: string,
  init: RequestInit,
  failCode: string,
  failMessage: string,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${requireSecretKey()}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: controller.signal,
    });
  } catch {
    throw new CustomError(502, failMessage, { code: failCode });
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let parsed: { status?: boolean; message?: string; data?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new CustomError(502, failMessage, { code: failCode });
  }

  if (!res.ok || parsed.status !== true) {
    throw new CustomError(502, parsed.message || failMessage, {
      code: failCode,
    });
  }

  return parsed.data as Record<string, unknown>;
}

export async function initializePaystackTransaction(
  params: IPaystackInitParams,
): Promise<IPaystackInitResult> {
  const data = await paystackRequest(
    '/transaction/initialize',
    {
      method: 'POST',
      body: JSON.stringify({
        email: params.email,
        amount: params.amount,
        currency: params.currency ?? 'GHS',
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata ?? {},
      }),
    },
    'PAYSTACK_INIT_FAILED',
    "Couldn't start the payment. Please try again.",
  );

  return {
    authorizationUrl: String(data.authorization_url),
    accessCode: String(data.access_code),
    reference: String(data.reference),
  };
}

/**
 * Refunds a settled charge. `amount` in minor units; omit for a full
 * refund. Paystack processes refunds asynchronously - a success here means
 * the refund was ACCEPTED, not yet settled.
 */
export async function refundPaystackTransaction(
  reference: string,
  amount?: number,
): Promise<void> {
  await paystackRequest(
    '/refund',
    {
      method: 'POST',
      body: JSON.stringify({
        transaction: reference,
        ...(amount !== undefined ? { amount } : {}),
      }),
    },
    'PAYSTACK_REFUND_FAILED',
    "Couldn't process the refund. Please try again.",
  );
}

export async function verifyPaystackTransaction(
  reference: string,
): Promise<IPaystackVerifiedTransaction> {
  const data = await paystackRequest(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: 'GET' },
    'PAYSTACK_VERIFY_FAILED',
    "Couldn't verify the payment. Please try again.",
  );

  const customer = (data.customer ?? {}) as Record<string, unknown>;

  return {
    status: String(data.status ?? ''),
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? ''),
    reference: String(data.reference ?? reference),
    paidAt: data.paid_at ? String(data.paid_at) : null,
    channel: data.channel ? String(data.channel) : null,
    customerEmail: customer.email ? String(customer.email) : null,
  };
}
