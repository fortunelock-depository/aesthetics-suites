// src/components/admin/profile-form.tsx
'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile, type ProfileState } from '@/lib/account';

/**
 * Self-service profile edit (fullname, phone). Email and role are shown
 * read-only - they stay admin-managed. Controlled inputs so a failed
 * submit never wipes what was typed.
 */
export function ProfileForm({
  initial,
}: {
  initial: { fullname: string; email: string; phone: string | null };
}) {
  const [fullname, setFullname] = useState(initial.fullname);
  const [phone, setPhone] = useState(initial.phone ?? '');

  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    { success: false },
  );

  useEffect(() => {
    if (state.success && state.message) toast.success(state.message);
    else if (!state.success && state.errors?._form) {
      toast.error(state.errors._form[0]);
    }
  }, [state]);

  return (
    <form action={action} noValidate className="max-w-md space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={initial.email} disabled />
        <p className="text-xs text-muted-foreground">
          Your sign-in email is managed by a super admin.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="profile-fullname">Full name</Label>
        <Input
          id="profile-fullname"
          name="fullname"
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
          aria-invalid={!!state.errors?.fullname}
        />
        {state.errors?.fullname && (
          <p className="text-xs text-destructive">{state.errors.fullname[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="profile-phone">Phone</Label>
        <Input
          id="profile-phone"
          name="phone"
          type="tel"
          placeholder="024 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={!!state.errors?.phone}
        />
        {state.errors?.phone && (
          <p className="text-xs text-destructive">{state.errors.phone[0]}</p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
