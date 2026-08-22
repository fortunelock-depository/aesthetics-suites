// src/validations/form-primitives.ts
//
// Pure zod building blocks for CLIENT form schemas whose inputs hold raw
// strings: no clamping while typing - parse on submit.
// Money enters as GHS text and leaves as integer pesewas; numerics leave
// as ints. Shared by every admin form so the transforms can never drift.
import { z } from 'zod';

/** "450" / "450.5" / "450.50" (GHS) -> integer pesewas, >= minMinor. */
export const ghsAmountField = (label: string, minMinor: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, `Enter ${label} in GHS, e.g. 450 or 450.50`)
    .transform((value) => Math.round(parseFloat(value) * 100))
    .refine((value) => value >= minMinor, {
      message:
        minMinor > 0 ? `Must be at least GHS ${minMinor / 100}` : 'Too low',
    });

/** Required whole number within [min, max]. */
export const intStringField = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, 'Required')
    .transform((value, ctx) => {
      const n = Number(value);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({
          code: 'custom',
          message: `Enter a whole number between ${min} and ${max}`,
        });
        return z.NEVER;
      }
      return n;
    });

/** Optional whole number within [min, max]; empty -> undefined. */
export const optionalIntStringField = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) return undefined;
      const n = Number(value);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({
          code: 'custom',
          message: `Enter a whole number between ${min} and ${max}`,
        });
        return z.NEVER;
      }
      return n;
    });

/** Optional GHS amount; empty -> undefined, else integer pesewas. */
export const optionalGhsAmountField = (label: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) return undefined;
      if (!/^\d+(\.\d{1,2})?$/.test(value)) {
        ctx.addIssue({
          code: 'custom',
          message: `Enter ${label} in GHS, e.g. 900 or 900.50`,
        });
        return z.NEVER;
      }
      return Math.round(parseFloat(value) * 100);
    });

/** A native date input's value. */
export const dateOnlyString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date');
