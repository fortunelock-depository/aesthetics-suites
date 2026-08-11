// src/components/admin/users/users-table.tsx
//
// The reference consumer for the whole list-page stack: URL-synced query
// state -> RTK Query -> the dual-render DataTable, with the shared toolbar,
// filter chips, empty states and a confirmed destructive action.
'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Eye,
  MoreHorizontal,
  Search,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { DataTable, useDataTable } from '@/components/ui/data-table';
import { ROW_BADGE, RowCard } from '@/components/ui/table-bits';
import { clearAllFiltersPatch } from '@/components/ui/table-empty-logic';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { DataTableToolbar } from '@/components/filters/data-table-toolbar';
import {
  ActiveFilters,
  FilterChip,
} from '@/components/filters/active-filters';
import { LabeledSelect } from '@/components/forms/labeled-select';
import { useTableQueryState } from '@/hooks/use-table-query-state';
import type { TableFiltersSpec } from '@/hooks/table-query-state-logic';
import { useConfirm } from '@/hooks/use-confirm';
import { useGetUsersQuery, useDeleteUserMutation } from '@/redux/users-api';
import { extractApiError } from '@/lib/extract-api-error';
import { formatDate } from '@/lib/format-date';
import { ErrorState } from '@/components/ui/error-state';
import { createUserColumns, ROLE_TONE } from './columns';
import {
  USER_ROLE_LABEL,
  USER_ROLES,
  type IUserRow,
  type UserRoleValue,
} from '@/types/user.types';

interface UsersFilters extends Record<string, string | boolean | undefined> {
  search?: string;
  role?: UserRoleValue;
}

/** Mirrors validations/user-validation.ts (usersQuerySchema). */
const FILTERS_SPEC: TableFiltersSpec<UsersFilters> = {
  search: { kind: 'string' },
  role: { kind: 'enum', values: USER_ROLES },
};

const ROLE_OPTIONS = [
  { value: 'any', label: 'Any role' },
  ...USER_ROLES.map((role) => ({ value: role, label: USER_ROLE_LABEL[role] })),
];

export function UsersTable() {
  const {
    page,
    pageSize,
    filters,
    setPage,
    setPageSize,
    patchFilters,
    queryParams,
  } = useTableQueryState<UsersFilters>({ spec: FILTERS_SPEC });

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetUsersQuery(queryParams);
  const [deleteUser] = useDeleteUserMutation();
  const { confirm, confirmDialog } = useConfirm();

  const users = React.useMemo(() => data?.data ?? [], [data]);
  const totalCount = data?.pagination.totalItems ?? 0;
  const loading = isLoading || isFetching;

  const handleDelete = React.useCallback(
    async (user: IUserRow) => {
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
      } catch (err) {
        toast.error(extractApiError(err).message);
      }
    },
    [confirm, deleteUser],
  );

  const renderActions = React.useCallback(
    (user: IUserRow) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${user.fullname}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/users/${user.id}`}>
              <Eye />
              View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => handleDelete(user)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [handleDelete],
  );

  const columns = React.useMemo(
    () => createUserColumns({ renderActions }),
    [renderActions],
  );

  const table = useDataTable({
    columns,
    data: users,
    pageSize,
    totalCount,
    getRowId: (row) => row.id,
  });

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load users"
        description={extractApiError(error).message}
        onRetry={refetch}
      />
    );
  }

  const roleFilterValue = filters.role ?? 'any';
  const nonSearchFilterCount = filters.role === undefined ? 0 : 1;

  return (
    <>
      <DataTable
        table={table}
        loading={loading}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        filters={filters}
        onClearFilters={() => patchFilters(clearAllFiltersPatch(filters))}
        entityLabel="users"
        emptyState={
          <EmptyState
            icon={Users}
            title="No users yet"
            description="Users appear here as accounts are created. Seed the first admin with `npm run seed`."
          />
        }
        toolbar={
          <div className="space-y-3">
            <DataTableToolbar
              table={table}
              searchValue={filters.search ?? ''}
              onSearchChange={(value) =>
                patchFilters({ search: value || undefined })
              }
              searchPlaceholder="Search by name or email…"
              filterCount={nonSearchFilterCount}
              hasFiltersApplied={
                Boolean(filters.search) || filters.role !== undefined
              }
              onClearAll={() => patchFilters(clearAllFiltersPatch(filters))}
              panelClassName="lg:grid-cols-3"
              filterFields={
                <LabeledSelect
                  label="Role"
                  options={ROLE_OPTIONS}
                  value={roleFilterValue}
                  onValueChange={(value) =>
                    patchFilters({
                      role:
                        value === 'any'
                          ? undefined
                          : (value as UserRoleValue),
                    })
                  }
                />
              }
            />
            <ActiveFilters
              show={Boolean(filters.search) || filters.role !== undefined}
            >
              {filters.search && (
                <FilterChip
                  icon={Search}
                  onRemove={() => patchFilters({ search: undefined })}
                >
                  {filters.search}
                </FilterChip>
              )}
              {filters.role !== undefined && (
                <FilterChip
                  icon={Shield}
                  onRemove={() => patchFilters({ role: undefined })}
                >
                  {USER_ROLE_LABEL[filters.role]}
                </FilterChip>
              )}
            </ActiveFilters>
          </div>
        }
        renderRowCard={(row) => {
          const user = row.original;
          return (
            <RowCard
              leading={
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label="Select row"
                />
              }
              action={renderActions(user)}
            >
              <div className="flex items-center justify-between gap-2">
                <StatusBadge tone={ROLE_TONE[user.role]} className={ROW_BADGE}>
                  {USER_ROLE_LABEL[user.role]}
                </StatusBadge>
                <span className="flex-none text-[11px] text-muted-foreground">
                  {formatDate(user.createdAt)}
                </span>
              </div>
              <div className="mt-1 min-w-0">
                <Link
                  href={`/admin/users/${user.id}`}
                  className="block truncate text-sm font-medium text-foreground hover:underline"
                >
                  {user.fullname}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </RowCard>
          );
        }}
      />
      {confirmDialog}
    </>
  );
}
