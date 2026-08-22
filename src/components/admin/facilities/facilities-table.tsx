// src/components/admin/facilities/facilities-table.tsx
//
// Facilities list on the shared table stack: single published filter
// inline beside the search, no Filters toggle.
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Eye,
  ImageIcon,
  Landmark,
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
  useGetFacilitiesQuery,
  useDeleteFacilityMutation,
} from '@/redux/facilities-api';
import { extractApiError } from '@/lib/extract-api-error';
import { ErrorState } from '@/components/ui/error-state';
import type { IFacilityRow } from '@/types/facility.types';

interface FacilitiesFilters
  extends Record<string, string | boolean | undefined> {
  search?: string;
  isPublished?: 'true' | 'false';
}

/** Mirrors validations/hotel-validation.ts (facilitiesQuerySchema). */
const FILTERS_SPEC: TableFiltersSpec<FacilitiesFilters> = {
  search: { kind: 'string' },
  isPublished: { kind: 'enum', values: ['true', 'false'] },
};

const STATUS_OPTIONS = [
  { value: 'any', label: 'Any status' },
  { value: 'true', label: 'Published' },
  { value: 'false', label: 'Draft' },
];

function CoverThumb({ row }: { row: IFacilityRow }) {
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
  renderActions: (row: IFacilityRow) => React.ReactNode;
}): ColumnDef<IFacilityRow>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Facility',
      meta: { headClassName: 'w-2/5', cellClassName: 'w-2/5 max-w-0' },
      cell: ({ row }) => (
        <Link
          href={`/admin/facilities/${row.original.id}`}
          className="flex max-w-[85%] items-center gap-2.5"
          title={row.original.name}
        >
          <CoverThumb row={row.original} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground hover:underline">
              {row.original.name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {row.original.eyebrow}
            </span>
          </span>
        </Link>
      ),
      enableHiding: false,
    },
    {
      id: 'hours',
      header: 'Hours',
      cell: ({ row }) => (
        <span
          className="block min-w-0 max-w-44 truncate text-sm text-muted-foreground"
          title={row.original.openingHours ?? undefined}
        >
          {row.original.openingHours ?? '-'}
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

export function FacilitiesTable() {
  const {
    page,
    pageSize,
    filters,
    setPage,
    setPageSize,
    patchFilters,
    queryParams,
  } = useTableQueryState<FacilitiesFilters>({ spec: FILTERS_SPEC });

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetFacilitiesQuery(queryParams);
  const [deleteFacility] = useDeleteFacilityMutation();
  const { confirm, confirmDialog } = useConfirm();

  const facilities = React.useMemo(() => data?.data ?? [], [data]);
  const totalCount = data?.pagination.totalItems ?? 0;
  const loading = isLoading || isFetching;

  const handleDelete = React.useCallback(
    async (facility: IFacilityRow) => {
      const ok = await confirm({
        title: 'Delete facility?',
        description: `This archives "${facility.name}" and removes it from the public site.`,
        confirmText: 'Delete facility',
        isDestructive: true,
      });
      if (!ok) return;
      try {
        await deleteFacility(facility.id).unwrap();
        toast.success('Facility deleted');
      } catch (err) {
        toast.error(extractApiError(err).message);
      }
    },
    [confirm, deleteFacility],
  );

  const renderActions = React.useCallback(
    (facility: IFacilityRow) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${facility.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/facilities/${facility.id}`}>
              <Eye />
              View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => handleDelete(facility)}
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
    data: facilities,
    pageSize,
    totalCount,
    getRowId: (row) => row.id,
  });

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load facilities"
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
        entityLabel="facilities"
        emptyState={
          <EmptyState
            icon={Landmark}
            title="No facilities yet"
            description="Create your first facility with the Add facility button."
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
              searchPlaceholder="Search facilities by name…"
              filterCount={nonSearchFilterCount}
              hasFiltersApplied={
                Boolean(filters.search) || filters.isPublished !== undefined
              }
              onClearAll={() => patchFilters(clearAllFiltersPatch(filters))}
              // ONE filter -> inline beside the search, no Filters toggle.
              inlineFilter={
                <LabeledSelect
                  id="facilities-status-filter"
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
          const facility = row.original;
          return (
            <RowCard action={renderActions(facility)}>
              <div className="flex items-center justify-between gap-2">
                <StatusBadge
                  tone={facility.isPublished ? 'success' : 'neutral'}
                  className={ROW_BADGE}
                >
                  {facility.isPublished ? 'Published' : 'Draft'}
                </StatusBadge>
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-2.5">
                <CoverThumb row={facility} />
                <div className="min-w-0">
                  <Link
                    href={`/admin/facilities/${facility.id}`}
                    className="block truncate text-sm font-medium text-foreground hover:underline"
                  >
                    {facility.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {facility.eyebrow}
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
