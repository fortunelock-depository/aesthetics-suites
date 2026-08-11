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
}

export type IVerifyPaymentResponse = IApiResponse<IVerifiedPayment>;
