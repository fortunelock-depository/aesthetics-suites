// src/components/admin/users/columns.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { DateTimeCell } from '@/components/ui/table-bits';
import type { StatusTone } from '@/lib/status-colors';
import { initials } from '@/lib/initials';
import { USER_ROLE_LABEL, type IUserRow } from '@/types/user.types';

/** Mini avatar for list rows: photo when set, initials otherwise. */
export function UserAvatar({
  fullname,
  photoUrl,
  className = 'h-8 w-8 text-xs',
}: {
  fullname: string;
  photoUrl: string | null;
  className?: string;
}) {
  return (
    <span
      className={`relative grid flex-none place-items-center overflow-hidden rounded-full bg-brand font-heading font-bold text-brand-foreground ${className}`}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={fullname}
          fill
          sizes="32px"
          className="object-cover"
        />
      ) : (
        initials(fullname)
      )}
    </span>
  );
}

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
      accessorKey: 'fullname',
      header: 'Name',
      meta: { headClassName: 'w-2/5', cellClassName: 'w-2/5 max-w-0' },
      cell: ({ row }) => (
        <Link
          href={`/admin/users/${row.original.id}`}
          className="flex max-w-[85%] items-center gap-2"
          title={row.original.fullname}
        >
          <UserAvatar
            fullname={row.original.fullname}
            photoUrl={row.original.profilePhoto}
          />
          <span className="min-w-0 truncate text-sm font-medium text-foreground hover:underline">
            {row.original.fullname}
          </span>
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
      header: () => <span className="block text-right">Joined</span>,
      cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
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
