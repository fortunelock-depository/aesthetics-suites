// src/components/admin/users/user-security-card.tsx
'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { KeyRound, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { SectionCard } from '@/components/admin/detail-bits';
import { PasswordField } from '@/components/admin/change-password-form';
import { useConfirm } from '@/hooks/use-confirm';
import {
  useAdminResetPasswordMutation,
  useAdminDisableTwoFactorMutation,
} from '@/redux/users-api';
import { extractApiError } from '@/lib/extract-api-error';
import { adminResetPasswordSchema } from '@/validations/user-validation';
import type { IUserRow } from '@/types/user.types';

/**
 * Super-admin rescue tools for a locked-out user: set a new password
 * (signs them out of every device) and switch off 2FA when they've lost
 * email access. Both are confirmed before acting; the password form stays
 * hidden behind its button until then.
 */
export function UserSecurityCard({ user }: { user: IUserRow }) {
  const [resetting, setResetting] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [errors, setErrors] = React.useState<{
    password?: string[];
    confirmPassword?: string[];
  }>({});

  const [resetPassword, { isLoading: isResetting }] =
    useAdminResetPasswordMutation();
  const [disableTwoFactor, { isLoading: isDisabling }] =
    useAdminDisableTwoFactorMutation();
  const { confirm, confirmDialog } = useConfirm();

  const closeResetForm = () => {
    setPassword('');
    setConfirmPassword('');
    setErrors({});
    setResetting(false);
  };

  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // The SAME schema the API enforces, parsed here for inline errors.
    const parsed = adminResetPasswordSchema.safeParse({
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }
    setErrors({});

    const ok = await confirm({
      title: 'Reset password?',
      description: `${user.fullname} is signed out of ALL devices and must sign in with the new password you set.`,
      confirmText: 'Reset password',
      isDestructive: true,
    });
    if (!ok) return;

    try {
      const res = await resetPassword({
        id: user.id,
        password: parsed.data.password,
        confirmPassword: parsed.data.confirmPassword,
      }).unwrap();
      toast.success(res.message ?? 'Password reset.');
      closeResetForm();
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  const handleDisableTwoFactor = async () => {
    const ok = await confirm({
      title: 'Disable two-factor authentication?',
      description: `${user.fullname} goes back to password-only sign-in. Use this when they have lost access to their email codes.`,
      confirmText: 'Disable 2FA',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      const res = await disableTwoFactor(user.id).unwrap();
      toast.success(res.message ?? 'Two-factor disabled.');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  return (
    <SectionCard
      title="Security"
      description="Rescue tools for when this user is locked out."
    >
      <div className="space-y-5">
        {resetting ? (
          <form
            onSubmit={handleResetSubmit}
            noValidate
            className="max-w-md space-y-4"
          >
            <PasswordField
              id="admin-new-password"
              name="password"
              label="New password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              errors={errors.password}
            />
            <PasswordField
              id="admin-confirm-password"
              name="confirmPassword"
              label="Confirm new password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              errors={errors.confirmPassword}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isResetting}>
                {isResetting ? 'Resetting…' : 'Reset password'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={closeResetForm}
                disabled={isResetting}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3 border border-border p-4 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Password</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Set a new one and sign them out everywhere.
              </p>
            </div>
            <Button
              variant="outline"
              className="self-start min-[480px]:self-auto"
              onClick={() => setResetting(true)}
            >
              <KeyRound />
              Reset password
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-3 border border-border p-4 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                Two-factor authentication
              </p>
              <StatusBadge tone={user.twoFactorEnabled ? 'success' : 'neutral'}>
                {user.twoFactorEnabled ? 'On' : 'Off'}
              </StatusBadge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {user.twoFactorEnabled
                ? 'Switch off if they cannot receive their email codes.'
                : 'Only the user can enable this, from their own Settings.'}
            </p>
          </div>
          {user.twoFactorEnabled && (
            <Button
              variant="outline"
              className="self-start text-destructive hover:text-destructive min-[480px]:self-auto"
              onClick={handleDisableTwoFactor}
              disabled={isDisabling}
            >
              <ShieldOff />
              {isDisabling ? 'Disabling…' : 'Disable 2FA'}
            </Button>
          )}
        </div>
      </div>
      {confirmDialog}
    </SectionCard>
  );
}
