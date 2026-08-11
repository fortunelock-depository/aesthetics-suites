// src/lib/paystack/signature.ts
import 'server-only';
import crypto from 'crypto';
import { ENV } from '@/config/env';

/**
 * Verifies the `x-paystack-signature` header: HMAC-SHA512 of the RAW request
 * body, keyed by the secret key, hex digest, constant-time compare.
 * Fail-closed on any missing input.
 */
export const verifyPaystackSignature = (
  rawBody: string,
  signature: string | undefined | null,
): boolean => {
  if (!rawBody || !signature || !ENV.PAYSTACK_SECRET_KEY) return false;

  const expected = crypto
    .createHmac('sha512', ENV.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');

  // Guards timingSafeEqual, which throws on length mismatch.
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};
