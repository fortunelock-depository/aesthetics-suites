// src/lib/account.ts
//
// Self-service account actions for signed-in staff (the khadys/dms
// pattern): profile edit, and a password change that bumps the session
// epoch - signing the account out of every OTHER device - then re-issues
// the current device's cookie so it stays signed in.
'use server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { createSession, verifySession } from '@/lib/session';
import { revokeAllUserSecurityTokens } from '@/utils/user-security-tokens';
import { sendPasswordChangedEmail } from '@/lib/mail/auth-emails';
import { BCRYPT_SALT_ROUNDS } from '@/config/constants';
import { changePasswordSchema } from '@/validations/auth-validation';
import { profileUpdateSchema } from '@/validations/user-validation';

export type ProfileState = {
  success: boolean;
  message?: string;
  errors?: { fullname?: string[]; phone?: string[]; _form?: string[] };
};

export async function updateProfile(
  _state: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { userId } = await verifySession();

  const phoneRaw = formData.get('phone');
  const parsed = profileUpdateSchema.safeParse({
    fullname: formData.get('fullname'),
    // An emptied field clears the saved number.
    phone: typeof phoneRaw === 'string' && phoneRaw.trim() === '' ? null : phoneRaw,
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      fullname: parsed.data.fullname,
      phone: parsed.data.phone ?? null,
    },
  });

  return { success: true, message: 'Profile updated.' };
}

export type ChangePasswordState = {
  success: boolean;
  /** Changes on every success - the form remounts on it to clear fields. */
  changedAt?: number;
  message?: string;
  errors?: {
    currentPassword?: string[];
    newPassword?: string[];
    confirmPassword?: string[];
    _form?: string[];
  };
};

export async function changePassword(
  _state: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const { userId, role } = await verifySession();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, email: true, fullname: true, password: true },
  });
  if (!user) return { success: false, errors: { _form: ['Account not found.'] } };

  if (!(await bcrypt.compare(parsed.data.currentPassword, user.password))) {
    return {
      success: false,
      errors: { currentPassword: ['Current password is incorrect'] },
    };
  }

  const hashedPassword = await bcrypt.hash(
    parsed.data.newPassword,
    BCRYPT_SALT_ROUNDS,
  );

  // Epoch bump invalidates every outstanding session JWT...
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword, sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });

  // ...then the CURRENT device gets a fresh cookie with the new epoch, so
  // only the other devices are signed out.
  await createSession(userId, role, updated.sessionVersion);

  await revokeAllUserSecurityTokens(userId);
  await sendPasswordChangedEmail(user);

  return {
    success: true,
    changedAt: Date.now(),
    message: 'Password changed. All other devices have been signed out.',
  };
}
