// src/components/admin/bookings/bookings-table.tsx
//
// The bookings ledger on the shared table stack. Four filters (status,
// room, from, to), so they live behind the Filters toggle in a 4-col
// desktop panel.
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CalendarCheck,
  CalendarRange,
  Eye,
  MoreHorizontal,
  Search,
  Shield,
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
import { DateFormField } from '@/components/forms/date-form-field';
import { LabeledSelect } from '@/components/forms/labeled-select';
import { useTableQueryState } from '@/hooks/use-table-query-state';
import type { TableFiltersSpec } from '@/hooks/table-query-state-logic';
import { useGetBookingsQuery } from '@/redux/bookings-api';
import { useGetRoomTypesQuery } from '@/redux/rooms-api';
import { extractApiError } from '@/lib/extract-api-error';
import { formatDate } from '@/lib/format-date';
import { formatMoney } from '@/lib/format-money';
import { ErrorState } from '@/components/ui/error-state';
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  type BookingStatusValue,
  type IBookingRow,
} from '@/types/booking.types';

interface BookingsFilters
  extends Record<string, string | boolean | undefined> {
  search?: string;
  status?: BookingStatusValue;
  roomTypeId?: string;
  from?: string;
  to?: string;
}

const STATUS_OPTIONS = [
  { value: 'any', label: 'Any status' },
  ...BOOKING_STATUSES.map((status) => ({
    value: status,
    label: BOOKING_STATUS_LABEL[status],
  })),
];

function createColumns({
  renderActions,
}: {
  renderActions: (row: IBookingRow) => React.ReactNode;
}): ColumnDef<IBookingRow>[] {
  return [
    {
      accessorKey: 'guestName',
      header: 'Guest',
      meta: { headClassName: 'w-2/5', cellClassName: 'w-2/5 max-w-0' },
      cell: ({ row }) => (
        <Link
          href={`/admin/bookings/${row.original.id}`}
          className="block max-w-[90%] min-w-0"
          title={row.original.guestName}
        >
          <span className="block truncate text-sm font-medium text-foreground hover:underline">
            {row.original.guestName}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.original.code} · {row.original.roomType?.name ?? 'Room'}
          </span>
        </Link>
      ),
      enableHiding: false,
    },
    {
      id: 'stay',
      header: 'Stay',
      cell: ({ row }) => (
        <span className="block text-sm whitespace-nowrap text-muted-foreground">
          {formatDate(row.original.checkIn)} -{' '}
          {formatDate(row.original.checkOut)}
          <span className="block text-xs">
            {row.original.nights} night{row.original.nights === 1 ? '' : 's'}
          </span>
        </span>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: () => <span className="block text-right">Total</span>,
      cell: ({ row }) => (
        <span className="block text-right text-sm font-medium whitespace-nowrap">
          {formatMoney(row.original.totalAmount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge tone={BOOKING_STATUS_TONE[row.original.status]}>
          {BOOKING_STATUS_LABEL[row.original.status] ?? row.original.status}
        </StatusBadge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: () => <span className="block text-right">Booked</span>,
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

export function BookingsTable() {
  const router = useRouter();
  const { data: roomTypesData } = useGetRoomTypesQuery({
    page: 1,
    limit: 100,
  });
  const roomOptions = React.useMemo(
    () => [
      { value: 'any', label: 'Any room' },
      ...(roomTypesData?.data ?? []).map((rt) => ({
        value: rt.id,
        label: rt.name,
      })),
    ],
    [roomTypesData],
  );

  const spec = React.useMemo<TableFiltersSpec<BookingsFilters>>(
    () => ({
      search: { kind: 'string' },
      status: { kind: 'enum', values: BOOKING_STATUSES },
      roomTypeId: {
        kind: 'enum',
        values: (roomTypesData?.data ?? []).map((rt) => rt.id),
      },
      from: { kind: 'string' },
      to: { kind: 'string' },
    }),
    [roomTypesData],
  );

  const {
    page,
    pageSize,
    filters,
    setPage,
    setPageSize,
    patchFilters,
    queryParams,
  } = useTableQueryState<BookingsFilters>({ spec });

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetBookingsQuery(queryParams);

  const bookings = React.useMemo(() => data?.data ?? [], [data]);
  const totalCount = data?.pagination.totalItems ?? 0;
  const loading = isLoading || isFetching;

  const renderActions = React.useCallback(
    (booking: IBookingRow) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${booking.code}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/bookings/${booking.id}`}>
              <Eye />
              View booking
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [],
  );

  const columns = React.useMemo(
    () => createColumns({ renderActions }),
    [renderActions],
  );

  const table = useDataTable({
    columns,
    data: bookings,
    pageSize,
    totalCount,
    getRowId: (row) => row.id,
  });

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load bookings"
        description={extractApiError(error).message}
        onRetry={refetch}
      />
    );
  }

  const nonSearchFilterCount = [
    filters.status,
    filters.roomTypeId,
    filters.from,
    filters.to,
  ].filter((v) => v !== undefined).length;
  const hasFiltersApplied =
    Boolean(filters.search) || nonSearchFilterCount > 0;
  const roomNameById = new Map(
    (roomTypesData?.data ?? []).map((rt) => [rt.id, rt.name]),
  );

  return (
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
      entityLabel="bookings"
      emptyState={
        <EmptyState
          icon={CalendarCheck}
          title="No bookings yet"
          description="Website and walk-in bookings land here as they are made."
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
            searchPlaceholder="Search by code, guest or email…"
            filterCount={nonSearchFilterCount}
            hasFiltersApplied={hasFiltersApplied}
            onClearAll={() => patchFilters(clearAllFiltersPatch(filters))}
            filterFieldCount={4}
            filterFields={
              <>
                <LabeledSelect
                  id="bookings-status-filter"
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={filters.status ?? 'any'}
                  onValueChange={(value) =>
                    patchFilters({
                      status:
                        value === 'any'
                          ? undefined
                          : (value as BookingStatusValue),
                    })
                  }
                />
                <LabeledSelect
                  id="bookings-room-filter"
                  label="Room"
                  options={roomOptions}
                  value={filters.roomTypeId ?? 'any'}
                  onValueChange={(value) =>
                    patchFilters({
                      roomTypeId: value === 'any' ? undefined : value,
                    })
                  }
                />
                <DateFormField
                  id="bookings-from-filter"
                  label="Staying from"
                  placeholder="Any date"
                  value={filters.from ?? ''}
                  onChange={(value) =>
                    patchFilters({ from: value || undefined })
                  }
                />
                <DateFormField
                  id="bookings-to-filter"
                  label="Staying until"
                  placeholder="Any date"
                  value={filters.to ?? ''}
                  onChange={(value) =>
                    patchFilters({ to: value || undefined })
                  }
                />
              </>
            }
          />
          <ActiveFilters show={hasFiltersApplied}>
            {filters.search && (
              <FilterChip
                icon={Search}
                onRemove={() => patchFilters({ search: undefined })}
              >
                {filters.search}
              </FilterChip>
            )}
            {filters.status !== undefined && (
              <FilterChip
                icon={Shield}
                onRemove={() => patchFilters({ status: undefined })}
              >
                {BOOKING_STATUS_LABEL[filters.status]}
              </FilterChip>
            )}
            {filters.roomTypeId !== undefined && (
              <FilterChip
                icon={CalendarCheck}
                onRemove={() => patchFilters({ roomTypeId: undefined })}
              >
                {roomNameById.get(filters.roomTypeId) ?? 'Room'}
              </FilterChip>
            )}
            {(filters.from || filters.to) && (
              <FilterChip
                icon={CalendarRange}
                onRemove={() =>
                  patchFilters({ from: undefined, to: undefined })
                }
              >
                {filters.from ? formatDate(filters.from) : '…'} -{' '}
                {filters.to ? formatDate(filters.to) : '…'}
              </FilterChip>
            )}
          </ActiveFilters>
        </div>
      }
      renderRowCard={(row) => {
        const booking = row.original;
        return (
          <RowCard
            onOpen={() => router.push(`/admin/bookings/${booking.id}`)}
            action={renderActions(booking)}
          >
            <div className="flex items-center justify-between gap-2">
              <StatusBadge
                tone={BOOKING_STATUS_TONE[booking.status]}
                className={ROW_BADGE}
              >
                {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
              </StatusBadge>
              <span className="flex-none text-xs font-semibold">
                {formatMoney(booking.totalAmount, booking.currency)}
              </span>
            </div>
            <div className="mt-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {booking.guestName}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {booking.code} · {booking.roomType?.name ?? 'Room'} ·{' '}
                {formatDate(booking.checkIn)} ({booking.nights}n)
              </p>
            </div>
          </RowCard>
        );
      }}
    />
  );
}
