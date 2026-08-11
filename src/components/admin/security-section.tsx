// src/components/admin/security-section.tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const handleEnable = () =>
    startTransition(async () => {
      const r = await requestTwoFactorSetup();
      if (r.success) {
        setSetupPending(true);
        toast.success(r.message ?? 'We sent a code to your email.');
      } else {
        toast.error(r.error ?? 'Could not start setup.');
      }
    });

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

  const handleDisable = () =>
    startTransition(async () => {
      const r = await disableTwoFactor();
      if (r.success) {
        setEnabled(false);
        setSetupPending(false);
        toast.success(r.message ?? 'Two-factor authentication disabled.');
      } else {
        toast.error(r.error ?? 'Could not disable.');
      }
    });

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
    </div>
  );
}
