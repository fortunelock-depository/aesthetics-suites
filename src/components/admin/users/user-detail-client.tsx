// src/components/admin/users/user-detail-client.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { BackLink } from '@/components/admin/back-link';
import { DetailPageSkeleton } from '@/components/admin/detail-skeletons';
import { ErrorState } from '@/components/ui/error-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { LabeledSelect } from '@/components/forms/labeled-select';
import { useConfirm } from '@/hooks/use-confirm';
import {
  useGetUserQuery,
  useDeleteUserMutation,
  useUpdateUserRoleMutation,
} from '@/redux/users-api';
import { extractApiError } from '@/lib/extract-api-error';
import { formatDateTime } from '@/lib/format-date';
import { EditUserForm } from './edit-user-form';
import { ROLE_TONE } from './columns';
import {
  USER_ROLES,
  USER_ROLE_LABEL,
  type IUserRow,
  type UserRoleValue,
} from '@/types/user.types';

const ROLE_OPTIONS = USER_ROLES.map((role) => ({
  value: role,
  label: USER_ROLE_LABEL[role],
}));

/** Key/value row: label above value on phones, side by side from 480px. */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-2.5 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
      <span className="flex-none text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 text-sm text-foreground [overflow-wrap:anywhere] min-[480px]:text-right">
        {children}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-card p-4 sm:p-6">
      <h3 className="font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function RoleCard({
  user,
  isSelf,
}: {
  user: IUserRow;
  isSelf: boolean;
}) {
  const [updateRole, { isLoading }] = useUpdateUserRoleMutation();
  const { confirm, confirmDialog } = useConfirm();

  const handleChange = async (value: string) => {
    const role = value as UserRoleValue;
    if (role === user.role) return;
    const ok = await confirm({
      title: 'Change role?',
      description: `${user.fullname} becomes ${USER_ROLE_LABEL[role]}. Access changes take effect on their very next request.`,
      confirmText: 'Change role',
    });
    if (!ok) return;
    try {
      await updateRole({ id: user.id, role }).unwrap();
      toast.success('Role updated');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  return (
    <SectionCard
      title="Role"
      description={
        isSelf
          ? 'You cannot change your own role.'
          : 'What this account can see and do in the console.'
      }
    >
      <div className="max-w-56">
        <LabeledSelect
          id="user-role"
          label="Role"
          options={ROLE_OPTIONS}
          value={user.role}
          onValueChange={handleChange}
          disabled={isSelf || isLoading}
        />
      </div>
      {confirmDialog}
    </SectionCard>
  );
}

/**
 * Single-user view: overview facts, detail edits, the confirmed role
 * control, and deletion - with self-guards mirroring the API's.
 */
export function UserDetailClient({
  userId,
  currentUserId,
}: {
  userId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useGetUserQuery(userId);
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const { confirm, confirmDialog } = useConfirm();

  if (isLoading) return <DetailPageSkeleton />;

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <BackLink href="/admin/users" label="All users" />
        <ErrorState
          title="Couldn't load user"
          description={extractApiError(error).message}
          onRetry={refetch}
        />
      </div>
    );
  }

  const user = data.data;
  const isSelf = user.id === currentUserId;

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete user?',
      description: `This archives ${user.fullname} (${user.email}). They will no longer be able to sign in.`,
      confirmText: 'Delete user',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deleteUser(user.id).unwrap();
      toast.success('User deleted');
      router.push('/admin/users');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  return (
    <section className="space-y-6">
      <BackLink href="/admin/users" label="All users" />
      <PageHeader
        title={user.fullname}
        description={user.email}
        actions={
          !isSelf && (
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 />
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          )
        }
      />

      <div className="border border-border bg-card p-4 sm:p-6">
        <h3 className="font-semibold">Overview</h3>
        <div className="mt-3 divide-y divide-border">
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
          <DetailRow label="Last updated">
            {formatDateTime(user.updatedAt)}
          </DetailRow>
        </div>
      </div>

      <SectionCard
        title="Details"
        description="Name, email and phone as they appear across the console."
      >
        {/* Remount after every save so the fields resync to fresh data. */}
        <EditUserForm key={user.updatedAt} user={user} />
      </SectionCard>

      <RoleCard user={user} isSelf={isSelf} />
      {confirmDialog}
    </section>
  );
}
