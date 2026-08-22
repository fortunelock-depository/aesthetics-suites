// src/components/admin/rooms/room-types-table.tsx
//
// Rooms list on the shared table stack: URL-synced query state -> RTK
// Query -> the dual-render DataTable, with the single published filter
// inline beside the search.
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BedDouble,
  Eye,
  ImageIcon,
  MoreHorizontal,
  Search,
  Trash2,
} from 'lucide-react';
import { DataTable, useDataTable } from '@/components/ui/data-table';
import { DateTimeCell, ROW_BADGE, RowCard } from '@/components/ui/table-bits';
import { clearAllFiltersPatch } from '@/components/ui/table-empty-logic';
import { EmptyState } from '@/components/ui/empty-state';
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
import {
  useGetRoomTypesQuery,
  useDeleteRoomTypeMutation,
} from '@/redux/rooms-api';
import { extractApiError } from '@/lib/extract-api-error';
import { formatMoney } from '@/lib/format-money';
import { ErrorState } from '@/components/ui/error-state';
import { sellableUnitCount, type IRoomTypeRow } from '@/types/room.types';

interface RoomsFilters extends Record<string, string | boolean | undefined> {
  search?: string;
  isPublished?: 'true' | 'false';
}

/** Mirrors validations/hotel-validation.ts (roomTypesQuerySchema). */
const FILTERS_SPEC: TableFiltersSpec<RoomsFilters> = {
  search: { kind: 'string' },
  isPublished: { kind: 'enum', values: ['true', 'false'] },
};

const STATUS_OPTIONS = [
  { value: 'any', label: 'Any status' },
  { value: 'true', label: 'Published' },
  { value: 'false', label: 'Draft' },
];

/** Cover thumbnail, or a quiet placeholder when no photo exists yet. */
function CoverThumb({ row }: { row: IRoomTypeRow }) {
  const cover = row.photos?.[0];
  return (
    <span className="relative grid h-10 w-14 flex-none place-items-center overflow-hidden bg-muted">
      {cover ? (
        <Image
          src={cover.url}
          alt={cover.alt ?? row.name}
          fill
          sizes="56px"
          className="object-cover"
        />
      ) : (
        <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
      )}
    </span>
  );
}

function createColumns({
  renderActions,
}: {
  renderActions: (row: IRoomTypeRow) => React.ReactNode;
}): ColumnDef<IRoomTypeRow>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Room',
      meta: { headClassName: 'w-2/5', cellClassName: 'w-2/5 max-w-0' },
      cell: ({ row }) => (
        <Link
          href={`/admin/rooms/${row.original.id}`}
          className="flex max-w-[85%] items-center gap-2.5"
          title={row.original.name}
        >
          <CoverThumb row={row.original} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground hover:underline">
              {row.original.name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Sleeps {row.original.capacityAdults}
              {row.original.capacityChildren > 0 &&
                ` + ${row.original.capacityChildren} children`}
            </span>
          </span>
        </Link>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'basePrice',
      header: () => <span className="block text-right">Price / night</span>,
      cell: ({ row }) => (
        <span className="block text-right text-sm font-medium whitespace-nowrap">
          {formatMoney(row.original.basePrice, row.original.currency)}
        </span>
      ),
    },
    {
      id: 'units',
      header: () => <span className="block text-right">Units</span>,
      cell: ({ row }) => (
        <span className="block text-right text-sm text-muted-foreground">
          {sellableUnitCount(row.original)}
        </span>
      ),
    },
    {
      accessorKey: 'isPublished',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge tone={row.original.isPublished ? 'success' : 'neutral'}>
          {row.original.isPublished ? 'Published' : 'Draft'}
        </StatusBadge>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: () => <span className="block text-right">Updated</span>,
      cell: ({ row }) => <DateTimeCell value={row.original.updatedAt} />,
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

export function RoomTypesTable() {
  const {
    page,
    pageSize,
    filters,
    setPage,
    setPageSize,
    patchFilters,
    queryParams,
  } = useTableQueryState<RoomsFilters>({ spec: FILTERS_SPEC });

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetRoomTypesQuery(queryParams);
  const [deleteRoomType] = useDeleteRoomTypeMutation();
  const { confirm, confirmDialog } = useConfirm();

  const roomTypes = React.useMemo(() => data?.data ?? [], [data]);
  const totalCount = data?.pagination.totalItems ?? 0;
  const loading = isLoading || isFetching;

  const handleDelete = React.useCallback(
    async (roomType: IRoomTypeRow) => {
      const ok = await confirm({
        title: 'Delete room?',
        description: `This archives "${roomType.name}" and removes it from the public site. Rooms with active bookings cannot be deleted.`,
        confirmText: 'Delete room',
        isDestructive: true,
      });
      if (!ok) return;
      try {
        await deleteRoomType(roomType.id).unwrap();
        toast.success('Room deleted');
      } catch (err) {
        toast.error(extractApiError(err).message);
      }
    },
    [confirm, deleteRoomType],
  );

  const renderActions = React.useCallback(
    (roomType: IRoomTypeRow) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${roomType.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/rooms/${roomType.id}`}>
              <Eye />
              View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => handleDelete(roomType)}
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
    () => createColumns({ renderActions }),
    [renderActions],
  );

  const table = useDataTable({
    columns,
    data: roomTypes,
    pageSize,
    totalCount,
    getRowId: (row) => row.id,
  });

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load rooms"
        description={extractApiError(error).message}
        onRetry={refetch}
      />
    );
  }

  const statusValue = filters.isPublished ?? 'any';
  const nonSearchFilterCount = filters.isPublished === undefined ? 0 : 1;

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
        entityLabel="rooms"
        emptyState={
          <EmptyState
            icon={BedDouble}
            title="No rooms yet"
            description="Create your first room listing with the Add room button."
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
              searchPlaceholder="Search rooms by name…"
              filterCount={nonSearchFilterCount}
              hasFiltersApplied={
                Boolean(filters.search) || filters.isPublished !== undefined
              }
              onClearAll={() => patchFilters(clearAllFiltersPatch(filters))}
              // ONE filter -> inline beside the search, no Filters toggle.
              inlineFilter={
                <LabeledSelect
                  id="rooms-status-filter"
                  label="Filter by status"
                  srOnlyLabel
                  options={STATUS_OPTIONS}
                  value={statusValue}
                  onValueChange={(value) =>
                    patchFilters({
                      isPublished:
                        value === 'any'
                          ? undefined
                          : (value as 'true' | 'false'),
                    })
                  }
                />
              }
            />
            <ActiveFilters
              show={
                Boolean(filters.search) || filters.isPublished !== undefined
              }
            >
              {filters.search && (
                <FilterChip
                  icon={Search}
                  onRemove={() => patchFilters({ search: undefined })}
                >
                  {filters.search}
                </FilterChip>
              )}
              {filters.isPublished !== undefined && (
                <FilterChip
                  icon={Eye}
                  onRemove={() => patchFilters({ isPublished: undefined })}
                >
                  {filters.isPublished === 'true' ? 'Published' : 'Draft'}
                </FilterChip>
              )}
            </ActiveFilters>
          </div>
        }
        renderRowCard={(row) => {
          const roomType = row.original;
          return (
            <RowCard action={renderActions(roomType)}>
              <div className="flex items-center justify-between gap-2">
                <StatusBadge
                  tone={roomType.isPublished ? 'success' : 'neutral'}
                  className={ROW_BADGE}
                >
                  {roomType.isPublished ? 'Published' : 'Draft'}
                </StatusBadge>
                <span className="flex-none text-xs font-semibold">
                  {formatMoney(roomType.basePrice, roomType.currency)}
                </span>
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-2.5">
                <CoverThumb row={roomType} />
                <div className="min-w-0">
                  <Link
                    href={`/admin/rooms/${roomType.id}`}
                    className="block truncate text-sm font-medium text-foreground hover:underline"
                  >
                    {roomType.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {sellableUnitCount(roomType)} unit
                    {sellableUnitCount(roomType) === 1 ? '' : 's'} · sleeps{' '}
                    {roomType.capacityAdults}
                    {roomType.capacityChildren > 0 &&
                      ` + ${roomType.capacityChildren}`}
                  </p>
                </div>
              </div>
            </RowCard>
          );
        }}
      />
      {confirmDialog}
    </>
  );
}
