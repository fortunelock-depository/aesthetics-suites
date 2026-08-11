// src/components/admin/reviews/reviews-table.tsx
//
// The moderation queue on the shared table stack. Two filters (status +
// room), so they live behind the Filters toggle per the dms layout rule.
'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BadgeCheck,
  Check,
  Eye,
  MessageSquareText,
  MoreHorizontal,
  Search,
  Shield,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { DataTable, useDataTable } from '@/components/ui/data-table';
import { DateTimeCell, ROW_BADGE, RowCard } from '@/components/ui/table-bits';
import { clearAllFiltersPatch } from '@/components/ui/table-empty-logic';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { DetailRow } from '@/components/admin/detail-bits';
import { useTableQueryState } from '@/hooks/use-table-query-state';
import type { TableFiltersSpec } from '@/hooks/table-query-state-logic';
import { useConfirm } from '@/hooks/use-confirm';
import {
  useGetAdminReviewsQuery,
  useModerateReviewMutation,
  useDeleteReviewMutation,
} from '@/redux/reviews-api';
import { useGetRoomTypesQuery } from '@/redux/rooms-api';
import { extractApiError } from '@/lib/extract-api-error';
import { formatDateTime } from '@/lib/format-date';
import { ErrorState } from '@/components/ui/error-state';
import {
  REVIEW_STATUSES,
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_TONE,
  type IAdminReviewRow,
  type ReviewStatusValue,
} from '@/types/review.types';

interface ReviewsFilters
  extends Record<string, string | boolean | undefined> {
  search?: string;
  status?: ReviewStatusValue;
  roomTypeId?: string;
}

const STATUS_OPTIONS = [
  { value: 'any', label: 'Any status' },
  ...REVIEW_STATUSES.map((status) => ({
    value: status,
    label: REVIEW_STATUS_LABEL[status],
  })),
];

export function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          key={step}
          className={
            step <= rating
              ? 'h-3.5 w-3.5 fill-brand text-brand'
              : 'h-3.5 w-3.5 text-border'
          }
        />
      ))}
    </span>
  );
}

/** Full review in a read-only dialog, with the moderation actions. */
function ReviewViewDialog({
  review,
  open,
  onOpenChange,
  onModerate,
  moderating,
}: {
  review: IAdminReviewRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModerate: (review: IAdminReviewRow, action: 'approve' | 'reject') => void;
  moderating: boolean;
}) {
  if (!review) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{review.title ?? 'Review'}</DialogTitle>
          <DialogDescription>
            {review.roomType.name} · submitted{' '}
            {formatDateTime(review.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Stars rating={review.rating} />
          <StatusBadge tone={REVIEW_STATUS_TONE[review.status]}>
            {REVIEW_STATUS_LABEL[review.status]}
          </StatusBadge>
          {review.booking && (
            <span className="inline-flex items-center gap-1 text-xs text-brand">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified stay · {review.booking.code}
            </span>
          )}
        </div>

        <p className="text-sm text-foreground [overflow-wrap:anywhere] whitespace-pre-line">
          {review.body}
        </p>

        <div className="divide-y divide-border border-t border-border">
          <DetailRow label="Guest">{review.guestName}</DetailRow>
          <DetailRow label="Email">{review.guestEmail}</DetailRow>
          {review.moderatedAt && (
            <DetailRow label="Moderated">
              {formatDateTime(review.moderatedAt)}
            </DetailRow>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {review.status !== 'REJECTED' && (
            <Button
              variant="outline"
              onClick={() => onModerate(review, 'reject')}
              disabled={moderating}
            >
              <X />
              Reject
            </Button>
          )}
          {review.status !== 'APPROVED' && (
            <Button
              onClick={() => onModerate(review, 'approve')}
              disabled={moderating}
            >
              <Check />
              Approve
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Mirrors validations/hotel-validation.ts (reviewsQuerySchema). */
const buildFiltersSpec = (
  roomIds: string[],
): TableFiltersSpec<ReviewsFilters> => ({
  search: { kind: 'string' },
  status: { kind: 'enum', values: REVIEW_STATUSES },
  roomTypeId: { kind: 'enum', values: roomIds },
});

function createColumns({
  renderActions,
  onView,
}: {
  renderActions: (row: IAdminReviewRow) => React.ReactNode;
  onView: (row: IAdminReviewRow) => void;
}): ColumnDef<IAdminReviewRow>[] {
  return [
    {
      accessorKey: 'guestName',
      header: 'Guest',
      meta: { headClassName: 'w-2/5', cellClassName: 'w-2/5 max-w-0' },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onView(row.original)}
          className="block max-w-[90%] min-w-0 text-left"
          title={row.original.guestName}
        >
          <span className="flex items-center gap-1.5">
            <span className="min-w-0 truncate text-sm font-medium text-foreground hover:underline">
              {row.original.guestName}
            </span>
            {row.original.booking && (
              <BadgeCheck
                className="h-3.5 w-3.5 flex-none text-brand"
                aria-label="Verified stay"
              />
            )}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.original.title ?? row.original.body}
          </span>
        </button>
      ),
      enableHiding: false,
    },
    {
      id: 'room',
      header: 'Room',
      cell: ({ row }) => (
        <span
          className="block min-w-0 max-w-40 truncate text-sm text-muted-foreground"
          title={row.original.roomType.name}
        >
          {row.original.roomType.name}
        </span>
      ),
    },
    {
      accessorKey: 'rating',
      header: 'Rating',
      cell: ({ row }) => <Stars rating={row.original.rating} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge tone={REVIEW_STATUS_TONE[row.original.status]}>
          {REVIEW_STATUS_LABEL[row.original.status]}
        </StatusBadge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: () => <span className="block text-right">Submitted</span>,
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

export function ReviewsTable() {
  // Room options for the filter panel (a hotel has a handful of types).
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
  const spec = React.useMemo(
    () =>
      buildFiltersSpec((roomTypesData?.data ?? []).map((rt) => rt.id)),
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
  } = useTableQueryState<ReviewsFilters>({ spec });

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetAdminReviewsQuery(queryParams);
  const [moderateReview, { isLoading: isModerating }] =
    useModerateReviewMutation();
  const [deleteReview] = useDeleteReviewMutation();
  const { confirm, confirmDialog } = useConfirm();
  const [viewing, setViewing] = React.useState<IAdminReviewRow | null>(null);
  const [viewOpen, setViewOpen] = React.useState(false);

  const reviews = React.useMemo(() => data?.data ?? [], [data]);
  const totalCount = data?.pagination.totalItems ?? 0;
  const loading = isLoading || isFetching;

  const handleView = React.useCallback((review: IAdminReviewRow) => {
    setViewing(review);
    setViewOpen(true);
  }, []);

  const handleModerate = React.useCallback(
    async (review: IAdminReviewRow, action: 'approve' | 'reject') => {
      try {
        await moderateReview({ id: review.id, action }).unwrap();
        toast.success(action === 'approve' ? 'Review approved - it is now live.' : 'Review rejected.');
        setViewOpen(false);
      } catch (err) {
        toast.error(extractApiError(err).message);
      }
    },
    [moderateReview],
  );

  const handleDelete = React.useCallback(
    async (review: IAdminReviewRow) => {
      const ok = await confirm({
        title: 'Delete review?',
        description: `${review.guestName}'s review of ${review.roomType.name} is archived and disappears from the site.`,
        confirmText: 'Delete review',
        isDestructive: true,
      });
      if (!ok) return;
      try {
        await deleteReview(review.id).unwrap();
        toast.success('Review deleted');
      } catch (err) {
        toast.error(extractApiError(err).message);
      }
    },
    [confirm, deleteReview],
  );

  const renderActions = React.useCallback(
    (review: IAdminReviewRow) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${review.guestName}'s review`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleView(review)}>
            <Eye />
            View review
          </DropdownMenuItem>
          {review.status !== 'APPROVED' && (
            <DropdownMenuItem
              onClick={() => handleModerate(review, 'approve')}
            >
              <Check />
              Approve
            </DropdownMenuItem>
          )}
          {review.status !== 'REJECTED' && (
            <DropdownMenuItem
              onClick={() => handleModerate(review, 'reject')}
            >
              <X />
              Reject
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => handleDelete(review)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [handleView, handleModerate, handleDelete],
  );

  const columns = React.useMemo(
    () => createColumns({ renderActions, onView: handleView }),
    [renderActions, handleView],
  );

  const table = useDataTable({
    columns,
    data: reviews,
    pageSize,
    totalCount,
    getRowId: (row) => row.id,
  });

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load reviews"
        description={extractApiError(error).message}
        onRetry={refetch}
      />
    );
  }

  const nonSearchFilterCount =
    (filters.status === undefined ? 0 : 1) +
    (filters.roomTypeId === undefined ? 0 : 1);
  const hasFiltersApplied =
    Boolean(filters.search) || nonSearchFilterCount > 0;
  const roomNameById = new Map(
    (roomTypesData?.data ?? []).map((rt) => [rt.id, rt.name]),
  );

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
        entityLabel="reviews"
        emptyState={
          <EmptyState
            icon={MessageSquareText}
            title="No reviews yet"
            description="Guest reviews land here for moderation before going live."
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
              searchPlaceholder="Search by guest, email or title…"
              filterCount={nonSearchFilterCount}
              hasFiltersApplied={hasFiltersApplied}
              onClearAll={() => patchFilters(clearAllFiltersPatch(filters))}
              filterFieldCount={2}
              filterFields={
                <>
                  <LabeledSelect
                    id="reviews-status-filter"
                    label="Status"
                    options={STATUS_OPTIONS}
                    value={filters.status ?? 'any'}
                    onValueChange={(value) =>
                      patchFilters({
                        status:
                          value === 'any'
                            ? undefined
                            : (value as ReviewStatusValue),
                      })
                    }
                  />
                  <LabeledSelect
                    id="reviews-room-filter"
                    label="Room"
                    options={roomOptions}
                    value={filters.roomTypeId ?? 'any'}
                    onValueChange={(value) =>
                      patchFilters({
                        roomTypeId: value === 'any' ? undefined : value,
                      })
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
                  {REVIEW_STATUS_LABEL[filters.status]}
                </FilterChip>
              )}
              {filters.roomTypeId !== undefined && (
                <FilterChip
                  icon={MessageSquareText}
                  onRemove={() => patchFilters({ roomTypeId: undefined })}
                >
                  {roomNameById.get(filters.roomTypeId) ?? 'Room'}
                </FilterChip>
              )}
            </ActiveFilters>
          </div>
        }
        renderRowCard={(row) => {
          const review = row.original;
          return (
            <RowCard
              onOpen={() => handleView(review)}
              action={renderActions(review)}
            >
              <div className="flex items-center justify-between gap-2">
                <StatusBadge
                  tone={REVIEW_STATUS_TONE[review.status]}
                  className={ROW_BADGE}
                >
                  {REVIEW_STATUS_LABEL[review.status]}
                </StatusBadge>
                <Stars rating={review.rating} />
              </div>
              <div className="mt-1 min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <span className="min-w-0 truncate">{review.guestName}</span>
                  {review.booking && (
                    <BadgeCheck
                      className="h-3.5 w-3.5 flex-none text-brand"
                      aria-label="Verified stay"
                    />
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {review.roomType.name} · {review.title ?? review.body}
                </p>
              </div>
            </RowCard>
          );
        }}
      />

      <ReviewViewDialog
        review={viewing}
        open={viewOpen}
        onOpenChange={setViewOpen}
        onModerate={handleModerate}
        moderating={isModerating}
      />
      {confirmDialog}
    </>
  );
}
