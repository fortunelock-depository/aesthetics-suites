// src/utils/codes.ts
import crypto from 'crypto';

/**
 * Payment idempotency reference, e.g. "AS-20260810-A3F2B1E8C9D4F0A1".
 * Generated at init time and passed to Paystack, which echoes it back on
 * verify and in the webhook.
 */
export const generatePaymentReference = (): string => {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `AS-${yyyymmdd}-${random}`;
};

/** Human booking reference, e.g. "ASB-20260810-4F2A9C". */
export const generateBookingCode = (): string => {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ASB-${yyyymmdd}-${random}`;
};
