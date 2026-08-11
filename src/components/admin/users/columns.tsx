// src/components/admin/users/columns.tsx
'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/status-badge';
import type { StatusTone } from '@/lib/status-colors';
import { formatDate } from '@/lib/format-date';
import { USER_ROLE_LABEL, type IUserRow } from '@/types/user.types';

/** Shared by the table, the mobile cards and the detail page. */
export const ROLE_TONE: Record<IUserRow['role'], StatusTone> = {
  SUPER_ADMIN: 'info',
  ADMIN: 'success',
  FRONT_DESK: 'neutral',
};

/**
 * Column defs for the users table. Width rules (house convention):
 * - Name is the ONE stretch column: 40% of the table, text truncating at
 *   90% of the cell so content never runs to the column edge.
 * - Email gets a fixed cap + title tooltip (secondary long content).
 * - Role/status are enum badges; the date stays compact.
 */
export function createUserColumns({
  renderActions,
}: {
  renderActions: (user: IUserRow) => React.ReactNode;
}): ColumnDef<IUserRow>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(!!value)
          }
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'fullname',
      header: 'Name',
      meta: { headClassName: 'w-2/5', cellClassName: 'w-2/5 max-w-0' },
      cell: ({ row }) => (
        <Link
          href={`/admin/users/${row.original.id}`}
          className="block max-w-[90%] truncate text-sm font-medium text-foreground hover:underline"
          title={row.original.fullname}
        >
          {row.original.fullname}
        </Link>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span
          className="block min-w-0 max-w-52 truncate text-sm text-muted-foreground"
          title={row.original.email}
        >
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <StatusBadge tone={ROLE_TONE[row.original.role]}>
          {USER_ROLE_LABEL[row.original.role]}
        </StatusBadge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">{renderActions(row.original)}</div>
      ),
      enableHiding: false,
    },
  ];
}
