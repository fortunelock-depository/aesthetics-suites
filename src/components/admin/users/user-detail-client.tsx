// src/components/admin/users/user-detail-client.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { BackLink } from '@/components/admin/back-link';
import { DetailPageSkeleton } from '@/components/admin/detail-skeletons';
import { DetailRow, SectionCard } from '@/components/admin/detail-bits';
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
import { UserSecurityCard } from './user-security-card';
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

function RoleCard({ user, isSelf }: { user: IUserRow; isSelf: boolean }) {
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
 * Single-user view. Details are READ-ONLY key/value rows until "Edit
 * details" is clicked (house pattern); role changes are confirmed; the
 * security card holds the super-admin rescue tools. Self-guards mirror
 * the API's.
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
  const [editing, setEditing] = React.useState(false);

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

      <SectionCard
        title="Details"
        description="This account as it appears across the console."
        actions={
          !editing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil />
              Edit details
            </Button>
          )
        }
      >
        {editing ? (
          <EditUserForm
            // Remount on fresh data so the fields resync after a save.
            key={user.updatedAt}
            user={user}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
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
              <StatusBadge
                tone={user.twoFactorEnabled ? 'success' : 'neutral'}
              >
                {user.twoFactorEnabled ? 'Enabled' : 'Off'}
              </StatusBadge>
            </DetailRow>
            <DetailRow label="Joined">
              {formatDateTime(user.createdAt)}
            </DetailRow>
            <DetailRow label="Last updated">
              {formatDateTime(user.updatedAt)}
            </DetailRow>
          </div>
        )}
      </SectionCard>

      <RoleCard user={user} isSelf={isSelf} />
      {!isSelf && <UserSecurityCard user={user} />}
      {confirmDialog}
    </section>
  );
}
