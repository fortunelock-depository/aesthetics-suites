// src/validations/phone-validation.ts
//
// Zod phone fields that VALIDATE AND NORMALIZE in one step: whatever the
// guest types ("024 123 4567", "+233 24-123-4567", "233241234567"), the
// parsed output is canonical E.164 - so every schema using these fields
// stores one shape.
import { z } from 'zod';
import { handlePhone } from '@/utils/phone';

/** Required phone -> E.164 string. */
export const phoneField = z
  .string()
  .trim()
  .min(3, 'Enter a phone number')
  .max(50)
  .transform((value, ctx) => {
    const parsed = handlePhone(value, { mode: 'parse' });
    if (!parsed) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a valid phone number (e.g. 024 123 4567)',
      });
      return z.NEVER;
    }
    return parsed.e164Format;
  });

/** Optional phone -> E.164 string | undefined (empty strings dropped). */
export const optionalPhoneField = z
  .string()
  .trim()
  .max(50)
  .optional()
  .transform((value, ctx) => {
    if (!value) return undefined;
    const parsed = handlePhone(value, { mode: 'parse' });
    if (!parsed) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a valid phone number (e.g. 024 123 4567)',
      });
      return z.NEVER;
    }
    return parsed.e164Format;
  });
