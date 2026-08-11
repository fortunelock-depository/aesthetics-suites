// src/redux/contact-api.ts
import { apiSlice } from './api-slice';
import type { IApiResponse } from '@/types/api';
import type { z } from 'zod';
import type { contactSchema } from '@/validations/hotel-validation';

export type ContactPayload = z.output<typeof contactSchema>;

export const contactApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    sendContactMessage: builder.mutation<IApiResponse<null>, ContactPayload>({
      query: (body) => ({ url: 'contact', method: 'POST', body }),
    }),
  }),
});

export const { useSendContactMessageMutation } = contactApi;
