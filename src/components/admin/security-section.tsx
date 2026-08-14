// src/components/admin/security-section.tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConfirm } from '@/hooks/use-confirm';
import {
  requestTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
} from '@/lib/auth';

export function SecuritySection({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [setupPending, setSetupPending] = useState(false);
  const [disablePending, setDisablePending] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const handleEnable = async () => {
    const ok = await confirm({
      title: 'Enable two-factor authentication?',
      description:
        'Every sign-in will require a one-time code emailed to you. We start by sending a code to confirm this device.',
      confirmText: 'Send code',
    });
    if (!ok) return;
    startTransition(async () => {
      const r = await requestTwoFactorSetup();
      if (r.success) {
        setSetupPending(true);
        toast.success(r.message ?? 'We sent a code to your email.');
      } else {
        toast.error(r.error ?? 'Could not start setup.');
      }
    });
  };

  const handleConfirm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setCodeError('Enter the 6-digit code we emailed you.');
      return;
    }
    setCodeError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('code', code);
      const r = await confirmTwoFactorSetup({ success: false }, formData);
      if (r.success && r.enabled) {
        setEnabled(true);
        setSetupPending(false);
        setCode('');
        toast.success(r.message ?? 'Two-factor authentication enabled.');
      } else {
        toast.error(r.error ?? 'Invalid code.');
      }
    });
  };

  const handleDisable = async () => {
    const ok = await confirm({
      title: 'Disable two-factor authentication?',
      description:
        'Sign-ins go back to password only, which is easier to compromise. Your current password is required to confirm.',
      confirmText: 'Continue',
      isDestructive: true,
    });
    if (!ok) return;
    setDisablePending(true);
  };

  // Password-gated: a hijacked session alone must not strip the second
  // factor (see disableTwoFactor server-side).
  const handleDisableSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!disablePassword) {
      setDisableError('Enter your current password.');
      return;
    }
    setDisableError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('password', disablePassword);
      const r = await disableTwoFactor({ success: false }, formData);
      if (r.success) {
        setEnabled(false);
        setSetupPending(false);
        setDisablePending(false);
        setDisablePassword('');
        toast.success(r.message ?? 'Two-factor authentication disabled.');
      } else {
        setDisableError(r.error ?? 'Could not disable.');
      }
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Two-factor authentication</h3>
            <span
              className={
                enabled
                  ? 'rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background'
                  : 'rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground'
              }
            >
              {enabled ? 'On' : 'Off'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {enabled
              ? 'Enabled - a one-time code is emailed at each sign-in.'
              : 'Add an extra step at sign-in with an emailed one-time code.'}
          </p>
        </div>
        {!setupPending &&
          !disablePending &&
          (enabled ? (
            <Button
              variant="outline"
              onClick={handleDisable}
              disabled={busy}
              className="self-start"
            >
              {busy ? 'Disabling…' : 'Disable 2FA'}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleEnable}
              disabled={busy}
              className="self-start"
            >
              {busy ? 'Sending code…' : 'Enable 2FA'}
            </Button>
          ))}
      </div>

      {disablePending && (
        <form
          onSubmit={handleDisableSubmit}
          noValidate
          className="mt-5 max-w-xs space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="disable-password">Current password</Label>
            <Input
              id="disable-password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!disableError}
              aria-describedby={disableError ? 'disable-password-error' : undefined}
              value={disablePassword}
              onChange={(e) => {
                setDisablePassword(e.target.value);
                if (disableError) setDisableError(null);
              }}
            />
            {disableError && (
              <p
                id="disable-password-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {disableError}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" disabled={busy}>
              {busy ? 'Disabling...' : 'Disable 2FA'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDisablePending(false);
                setDisablePassword('');
                setDisableError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {setupPending && (
        <form
          onSubmit={handleConfirm}
          noValidate
          className="mt-5 max-w-xs space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="code">Enter the code we emailed you</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              aria-invalid={!!codeError}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (codeError) setCodeError(null);
              }}
              className="text-center tracking-[0.4em]"
            />
            {codeError && (
              <p className="text-xs text-destructive">{codeError}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Confirming…' : 'Confirm & enable'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSetupPending(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {confirmDialog}
    </div>
  );
}
