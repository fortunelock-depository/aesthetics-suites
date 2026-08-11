// src/redux/payments-api.ts
import { apiSlice } from './api-slice';
import type { IVerifyPaymentResponse } from '@/types/payment.types';

export const paymentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    verifyPayment: builder.mutation<IVerifyPaymentResponse, { reference: string }>(
      {
        query: (body) => ({
          url: 'payments/verify',
          method: 'POST',
          body,
        }),
      },
    ),
  }),
});

export const { useVerifyPaymentMutation } = paymentsApi;
