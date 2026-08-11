// src/validations/user-validation.ts
import { z } from 'zod';
import { passwordSchema } from '@/validations/auth-validation';
import {
  optionalPhoneField,
  phoneField,
} from '@/validations/phone-validation';

const roleEnum = z.enum(['SUPER_ADMIN', 'ADMIN', 'FRONT_DESK']);

/**
 * Query params for GET /api/users. Mirrors the frontend table spec in
 * components/admin/users/users-table.tsx - keep the two in sync.
 */
export const usersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(255).optional(),
  role: roleEnum.optional(),
});

export const createUserSchema = z.object({
  email: z.email({ message: 'Invalid email format' }),
  fullname: z.string().trim().min(2).max(50),
  /** Normalized to E.164 ("+233...") by the field itself. */
  phone: optionalPhoneField,
  role: roleEnum,
  password: passwordSchema,
});

export const updateUserSchema = z
  .object({
    fullname: z.string().trim().min(2).max(50).optional(),
    /** E.164, or null to clear the saved number. */
    phone: z.null().or(phoneField).optional(),
    role: roleEnum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nothing to update',
  });

export type UsersQuery = z.infer<typeof usersQuerySchema>;

/** Self-service profile edit (role/email stay admin-managed). */
export const profileUpdateSchema = z.object({
  fullname: z.string().trim().min(2, 'Enter your name').max(50),
  phone: z.null().or(phoneField).optional(),
});
