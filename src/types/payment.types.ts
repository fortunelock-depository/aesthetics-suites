// src/types/payment.types.ts
import type { IApiResponse } from '@/types/api';
import type { VerifyOutcome } from '@/lib/payments/verify-outcome';

export type PaymentStatusValue = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED';

export interface IVerifiedPayment {
  reference: string;
  status: PaymentStatusValue;
  /** What to tell the guest, resolved server-side from the payment AND
   * booking state (mirrors `resolveVerifyOutcome`). Branch on this, not on
   * `status`: an auto-refunded charge is already REVERSED here. */
  outcome: VerifyOutcome;
  /** Minor units (pesewas). */
  amount: number;
  currency: string;
  paidAt: string | null;
  /** Post-settlement booking state (BOOKING payments): a paid charge is
   * not automatically a confirmed stay - the hold may have lapsed and
   * reconciliation may have refunded it. Null for non-booking purposes. */
  booking: {
    code: string;
    status: string;
    guestEmail: string;
    refunded: boolean;
    refundFailed: boolean;
  } | null;
}

export type IVerifyPaymentResponse = IApiResponse<IVerifiedPayment>;
