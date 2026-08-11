// src/components/admin/users/user-detail-client.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Shield, Trash2, User } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { BackLink } from '@/components/admin/back-link';
import { BandedDetailSkeleton } from '@/components/admin/detail-skeletons';
import { SectionCard } from '@/components/admin/detail-bits';
import { UserAvatarBand } from '@/components/admin/user-avatar-band';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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

function RoleCard({ user }: { user: IUserRow }) {
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
      description="What this account can see and do in the console."
    >
      <div className="max-w-56">
        <LabeledSelect
          id="user-role"
          label="Role"
          options={ROLE_OPTIONS}
          value={user.role}
          onValueChange={handleChange}
          disabled={isLoading}
        />
      </div>
      {confirmDialog}
    </SectionCard>
  );
}

/**
 * Another user's profile, presented exactly like one's own (dms shape):
 * avatar band + always-visible form under a Profile Information tab, and
 * a Security Settings tab holding the super-admin rescue tools. Viewing
 * YOURSELF never lands here - the server page redirects to /admin/profile.
 */
export function UserDetailClient({ userId }: { userId: string }) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useGetUserQuery(userId);
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const { confirm, confirmDialog } = useConfirm();

  if (isLoading) return <BandedDetailSkeleton band="avatar" tabs={2} actions={1} />;

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
    <section className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/admin/users" label="All users" />
      <PageHeader
        title={user.fullname}
        description={user.email}
        actions={
          <Button
            variant="outline"
            disabled={isDeleting}
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        }
      />

      <Tabs defaultValue="profile">
        <TabsList className="mb-4 grid w-full grid-cols-2 lg:mb-8">
          <TabsTrigger value="profile">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile Information</span>
            <span className="sm:hidden">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security Settings</span>
            <span className="sm:hidden">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0 space-y-6">
          <div className="@container border border-border bg-card p-4 sm:p-6">
            <UserAvatarBand
              fullname={user.fullname}
              role={user.role}
              photoUrl={user.profilePhoto}
              subtitle={`Joined ${formatDateTime(user.createdAt)} · Last updated ${formatDateTime(user.updatedAt)}`}
            />
            <div className="mt-6">
              {/* Remount on fresh data so the fields resync after a save. */}
              <EditUserForm key={user.updatedAt} user={user} />
            </div>
          </div>
          <RoleCard user={user} />
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <UserSecurityCard user={user} />
        </TabsContent>
      </Tabs>

      {confirmDialog}
    </section>
  );
}
