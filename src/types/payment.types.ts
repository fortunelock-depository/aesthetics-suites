// src/types/payment.types.ts
import type { IApiResponse } from '@/types/api';

export type PaymentStatusValue = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED';

export interface IVerifiedPayment {
  reference: string;
  status: PaymentStatusValue;
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
  } | null;
}

export type IVerifyPaymentResponse = IApiResponse<IVerifiedPayment>;
