// src/components/admin/change-password-form.tsx
'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword, type ChangePasswordState } from '@/lib/account';

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  value,
  onChange,
  errors,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!errors}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {errors && <p className="text-xs text-destructive">{errors[0]}</p>}
    </div>
  );
}

/**
 * Authenticated password change (khadys/dms pattern): current password +
 * new + confirmation, all inline-validated; success signs every OTHER
 * device out (session-epoch bump) while this one stays in.
 */
export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<
    ChangePasswordState,
    FormData
  >(changePassword, { success: false });

  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message);
    } else if (!state.success && state.errors?._form) {
      toast.error(state.errors._form[0]);
    }
  }, [state]);

  return (
    <div className="border border-border bg-card p-4 sm:p-6">
      <h3 className="font-semibold">Change password</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Changing your password signs you out of every other device.
      </p>

      <ChangePasswordFields
        // Remounts (and so clears) the fields after each success.
        key={state.changedAt ?? 0}
        action={action}
        pending={pending}
        state={state}
      />
    </div>
  );
}

function ChangePasswordFields({
  action,
  pending,
  state,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  state: ChangePasswordState;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
      <form action={action} noValidate className="mt-5 max-w-md space-y-4">
        <PasswordField
          id="current-password"
          name="currentPassword"
          label="Current password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
          errors={state.errors?.currentPassword}
        />
        <PasswordField
          id="new-password"
          name="newPassword"
          label="New password"
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
          errors={state.errors?.newPassword}
        />
        <PasswordField
          id="confirm-password"
          name="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          errors={state.errors?.confirmPassword}
        />

        <Button type="submit" disabled={pending}>
          {pending ? 'Changing…' : 'Change password'}
        </Button>
      </form>
  );
}
