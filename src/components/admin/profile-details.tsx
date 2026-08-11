// src/components/admin/profile-details.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { DetailRow, SectionCard } from '@/components/admin/detail-bits';
import { ROLE_TONE } from '@/components/admin/users/columns';
import { updateProfile } from '@/lib/account';
import { formatDateTime } from '@/lib/format-date';
import { USER_ROLE_LABEL, type UserRoleValue } from '@/types/user.types';

export interface ProfileDetailsUser {
  fullname: string;
  email: string;
  phone: string | null;
  role: UserRoleValue;
  twoFactorEnabled: boolean;
  createdAt: string;
}

/**
 * Read-only by default (the dms pattern): facts render as key/value rows
 * until Edit profile is clicked, which swaps in the form. Email and role
 * stay admin-managed either way.
 */
export function ProfileDetails({ user }: { user: ProfileDetailsUser }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [fullname, setFullname] = React.useState(user.fullname);
  const [phone, setPhone] = React.useState(user.phone ?? '');
  const [errors, setErrors] = React.useState<{
    fullname?: string[];
    phone?: string[];
  }>({});
  const [pending, startTransition] = React.useTransition();

  const handleCancel = () => {
    setFullname(user.fullname);
    setPhone(user.phone ?? '');
    setErrors({});
    setEditing(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.set('fullname', fullname);
      formData.set('phone', phone);
      const r = await updateProfile({ success: false }, formData);
      if (r.success) {
        toast.success(r.message ?? 'Profile updated.');
        setErrors({});
        setEditing(false);
        router.refresh();
      } else {
        setErrors(r.errors ?? {});
        toast.error(r.errors?._form?.[0] ?? 'Check the highlighted fields.');
      }
    });
  };

  return (
    <SectionCard
      title="Profile details"
      description="Your account as it appears across the console."
      actions={
        !editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil />
            Edit profile
          </Button>
        )
      }
    >
      {editing ? (
        <form onSubmit={handleSubmit} noValidate className="max-w-md space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" value={user.email} disabled />
            <p className="text-xs text-muted-foreground">
              Your sign-in email is managed by a super admin.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-fullname">Full name</Label>
            <Input
              id="profile-fullname"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              aria-invalid={!!errors.fullname}
            />
            {errors.fullname && (
              <p className="text-xs text-destructive">{errors.fullname[0]}</p>
            )}
          </div>
          <div className="max-w-56 space-y-1.5">
            <Label htmlFor="profile-phone">Phone</Label>
            <Input
              id="profile-phone"
              type="tel"
              placeholder="024 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone[0]}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="divide-y divide-border">
          <DetailRow label="Full name">{user.fullname}</DetailRow>
          <DetailRow label="Email">{user.email}</DetailRow>
          <DetailRow label="Phone">{user.phone ?? 'Not set'}</DetailRow>
          <DetailRow label="Role">
            <StatusBadge tone={ROLE_TONE[user.role]}>
              {USER_ROLE_LABEL[user.role]}
            </StatusBadge>
          </DetailRow>
          <DetailRow label="Two-factor authentication">
            <StatusBadge tone={user.twoFactorEnabled ? 'success' : 'neutral'}>
              {user.twoFactorEnabled ? 'Enabled' : 'Off'}
            </StatusBadge>
          </DetailRow>
          <DetailRow label="Joined">{formatDateTime(user.createdAt)}</DetailRow>
        </div>
      )}
    </SectionCard>
  );
}
