// src/components/admin/discounts/discounts-table.tsx
//
// Discounts on the shared table stack. Small forms, so create/edit live
// in the shared form-dialog shell; code/type/room are immutable after
// creation (a shared code must keep meaning what it meant).
'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  TicketPercent,
  Trash2,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ResponsiveFormDialog } from '@/components/ui/responsive-form-dialog';
import { DataTableToolbar } from '@/components/filters/data-table-toolbar';
import {
  ActiveFilters,
  FilterChip,
} from '@/components/filters/active-filters';
import { TextField } from '@/components/forms/text-field';
import { LabeledSelect } from '@/components/forms/labeled-select';
import {
  dateOnlyString,
  optionalIntStringField,
} from '@/validations/form-primitives';
import { useTableQueryState } from '@/hooks/use-table-query-state';
import type { TableFiltersSpec } from '@/hooks/table-query-state-logic';
import { useConfirm } from '@/hooks/use-confirm';
import {
  useGetDiscountsQuery,
  useCreateDiscountMutation,
  useUpdateDiscountMutation,
  useDeleteDiscountMutation,
} from '@/redux/discounts-api';
import { useGetRoomTypesQuery } from '@/redux/rooms-api';
import { extractApiError } from '@/lib/extract-api-error';
import { formatDate } from '@/lib/format-date';
import { formatMoney } from '@/lib/format-money';
import { ErrorState } from '@/components/ui/error-state';
import {
  DISCOUNT_TYPE_LABEL,
  type DiscountTypeValue,
  type IDiscountRow,
} from '@/types/discount.types';

interface DiscountsFilters
  extends Record<string, string | boolean | undefined> {
  search?: string;
  isActive?: 'true' | 'false';
}

/** Mirrors validations/hotel-validation.ts (discountsQuerySchema). */
const FILTERS_SPEC: TableFiltersSpec<DiscountsFilters> = {
  search: { kind: 'string' },
  isActive: { kind: 'enum', values: ['true', 'false'] },
};

const STATUS_OPTIONS = [
  { value: 'any', label: 'Any status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const TYPE_OPTIONS = (
  Object.entries(DISCOUNT_TYPE_LABEL) as [DiscountTypeValue, string][]
).map(([value, label]) => ({ value, label }));

/** "10%" or "GHS 50.00" - how a discount's worth reads everywhere. */
function formatDiscountValue(discount: IDiscountRow): string {
  return discount.type === 'PERCENT'
    ? `${discount.value}%`
    : formatMoney(discount.value);
}

// ---- Form dialog (create + edit) ------------------------------------

/** Mirrors validations/hotel-validation.ts (discountCreateSchema). */
const discountFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Name the discount').max(150),
    code: z.union([
      z.literal('').transform(() => undefined),
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9_-]{3,50}$/, 'Letters, numbers, - and _ only'),
    ]),
    type: z.enum(['PERCENT', 'FIXED']),
    /** Interpreted per type below: percent 1-100, or GHS -> pesewas. */
    value: z.string().trim().min(1, 'Required'),
    roomTypeId: z.string(),
    startsAt: z.union([z.literal(''), dateOnlyString]),
    endsAt: z.union([z.literal(''), dateOnlyString]),
    minNights: optionalIntStringField(1, 90),
    maxUses: optionalIntStringField(1, 1_000_000),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'PERCENT') {
      const n = Number(data.value);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'Enter a whole percent between 1 and 100',
        });
      }
    } else if (!/^\d+(\.\d{1,2})?$/.test(data.value)) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Enter the amount in GHS, e.g. 50 or 50.50',
      });
    }
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'End date must be after the start date',
      });
    }
  });

type DiscountFormInput = z.input<typeof discountFormSchema>;
type DiscountFormOutput = z.output<typeof discountFormSchema>;

const BLANK: DiscountFormInput = {
  name: '',
  code: '',
  type: 'PERCENT',
  value: '',
  roomTypeId: 'any',
  startsAt: '',
  endsAt: '',
  minNights: '',
  maxUses: '',
  isActive: true,
};

const toNumericValue = (type: DiscountTypeValue, value: string): number =>
  type === 'PERCENT' ? Number(value) : Math.round(parseFloat(value) * 100);

const toIso = (date: string): string | undefined =>
  date ? `${date}T00:00:00.000Z` : undefined;

function DiscountFormDialog({
  discount,
  open,
  onOpenChange,
}: {
  /** Present = edit mode; absent = create. */
  discount: IDiscountRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [createDiscount, { isLoading: isCreating }] =
    useCreateDiscountMutation();
  const [updateDiscount, { isLoading: isUpdating }] =
    useUpdateDiscountMutation();
  const isLoading = isCreating || isUpdating;

  const { data: roomTypesData } = useGetRoomTypesQuery({
    page: 1,
    limit: 100,
  });
  const roomOptions = [
    { value: 'any', label: 'All rooms' },
    ...(roomTypesData?.data ?? []).map((rt) => ({
      value: rt.id,
      label: rt.name,
    })),
  ];

  const form = useForm<DiscountFormInput, unknown, DiscountFormOutput>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: BLANK,
  });
  const {
    register,
    control,
    formState: { errors },
  } = form;

  // Each open starts from the record being edited (or a clean form).
  React.useEffect(() => {
    if (open) {
      form.reset(
        discount
          ? {
              name: discount.name,
              code: discount.code ?? '',
              type: discount.type,
              value:
                discount.type === 'PERCENT'
                  ? String(discount.value)
                  : String(discount.value / 100),
              roomTypeId: discount.roomTypeId ?? 'any',
              startsAt: discount.startsAt?.slice(0, 10) ?? '',
              endsAt: discount.endsAt?.slice(0, 10) ?? '',
              minNights:
                discount.minNights === null ? '' : String(discount.minNights),
              maxUses:
                discount.maxUses === null ? '' : String(discount.maxUses),
              isActive: discount.isActive,
            }
          : BLANK,
      );
    }
  }, [open, discount, form]);

  const watchedType = form.watch('type');

  const onSubmit = async (data: DiscountFormOutput) => {
    try {
      if (discount) {
        // code/type/room are immutable after creation.
        await updateDiscount({
          id: discount.id,
          body: {
            name: data.name,
            value: toNumericValue(discount.type, data.value),
            startsAt: toIso(data.startsAt) ?? null,
            endsAt: toIso(data.endsAt) ?? null,
            minNights: data.minNights ?? null,
            maxUses: data.maxUses ?? null,
            isActive: data.isActive,
          },
        }).unwrap();
        toast.success('Discount updated');
      } else {
        await createDiscount({
          name: data.name,
          code: data.code,
          type: data.type,
          value: toNumericValue(data.type, data.value),
          roomTypeId: data.roomTypeId === 'any' ? undefined : data.roomTypeId,
          startsAt: toIso(data.startsAt),
          endsAt: toIso(data.endsAt),
          minNights: data.minNights,
          maxUses: data.maxUses,
          isActive: data.isActive,
        }).unwrap();
        toast.success('Discount created');
      }
      onOpenChange(false);
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          if (field in BLANK) {
            form.setError(field as keyof DiscountFormInput, {
              message: msg,
            });
          }
        }
      }
      toast.error(message);
    }
  };

  const editing = Boolean(discount);
  const isPercent = (discount?.type ?? watchedType) === 'PERCENT';

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={discount ? `Edit ${discount.name}` : 'Add discount'}
      description={
        discount
          ? 'Code, type and room scope are fixed once created - a shared code must keep meaning what it meant.'
          : 'A promo code guests type at checkout, or an automatic discount applied to every eligible stay.'
      }
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              label="Name"
              placeholder="e.g. Early Bird September"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>
          <TextField
            label="Promo code (optional)"
            placeholder="e.g. EARLY20"
            hint={
              editing
                ? discount?.code
                  ? 'Fixed once created.'
                  : 'Automatic - applies without a code.'
                : 'Leave empty for an automatic discount.'
            }
            disabled={editing}
            error={errors.code?.message}
            {...register('code')}
          />
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <LabeledSelect
                id="discount-type"
                label="Type"
                options={TYPE_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
                disabled={editing}
                error={errors.type?.message}
              />
            )}
          />
          <TextField
            label={isPercent ? 'Value (% off)' : 'Value (GHS off)'}
            inputMode={isPercent ? 'numeric' : 'decimal'}
            placeholder={isPercent ? '10' : '50.00'}
            error={errors.value?.message}
            {...register('value')}
          />
          <Controller
            name="roomTypeId"
            control={control}
            render={({ field }) => (
              <LabeledSelect
                id="discount-room"
                label="Applies to"
                options={roomOptions}
                value={field.value}
                onValueChange={field.onChange}
                disabled={editing}
                error={errors.roomTypeId?.message}
              />
            )}
          />
          <TextField
            label="Starts (optional)"
            type="date"
            error={errors.startsAt?.message}
            {...register('startsAt')}
          />
          <TextField
            label="Ends (optional)"
            type="date"
            hint="Exclusive - the day before this date is the last one covered."
            error={errors.endsAt?.message}
            {...register('endsAt')}
          />
          <TextField
            label="Minimum nights (optional)"
            inputMode="numeric"
            error={errors.minNights?.message}
            {...register('minNights')}
          />
          <TextField
            label="Max uses (optional)"
            inputMode="numeric"
            hint="Stops applying once this many bookings have used it."
            error={errors.maxUses?.message}
            {...register('maxUses')}
          />
          <label
            htmlFor="discount-active"
            className="flex items-center gap-2.5 sm:col-span-2"
          >
            <Checkbox
              id="discount-active"
              checked={form.watch('isActive')}
              onCheckedChange={(v) =>
                form.setValue('isActive', v === true, { shouldDirty: true })
              }
            />
            <span className="text-sm">
              Active - guests can use it right now
            </span>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 min-[360px]:flex-row min-[360px]:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Plus />}
            {isLoading
              ? 'Saving…'
              : discount
                ? 'Save changes'
                : 'Create discount'}
          </Button>
        </div>
      </form>
    </ResponsiveFormDialog>
  );
}

// ---- Table ----------------------------------------------------------

function windowLabel(discount: IDiscountRow): string {
  if (!discount.startsAt && !discount.endsAt) return 'Always on';
  const from = discount.startsAt ? formatDate(discount.startsAt) : '…';
  const to = discount.endsAt ? formatDate(discount.endsAt) : '…';
  return `${from} - ${to}`;
}

function createColumns({
  renderActions,
  onEdit,
}: {
  renderActions: (row: IDiscountRow) => React.ReactNode;
  onEdit: (row: IDiscountRow) => void;
}): ColumnDef<IDiscountRow>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Discount',
      meta: { headClassName: 'w-2/5', cellClassName: 'w-2/5 max-w-0' },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onEdit(row.original)}
          className="block max-w-[90%] min-w-0 text-left"
          title={row.original.name}
        >
          <span className="block truncate text-sm font-medium text-foreground hover:underline">
            {row.original.name}
          </span>
          <span className="block truncate font-mono text-xs text-muted-foreground">
            {row.original.code ?? 'Automatic'} ·{' '}
            {row.original.roomType?.name ?? 'All rooms'}
          </span>
        </button>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'value',
      header: () => <span className="block text-right">Value</span>,
      cell: ({ row }) => (
        <span className="block text-right text-sm font-medium whitespace-nowrap">
          {formatDiscountValue(row.original)}
        </span>
      ),
    },
    {
      id: 'window',
      header: 'Window',
      cell: ({ row }) => (
        <span className="block text-sm whitespace-nowrap text-muted-foreground">
          {windowLabel(row.original)}
        </span>
      ),
    },
    {
      id: 'usage',
      header: () => <span className="block text-right">Used</span>,
      cell: ({ row }) => (
        <span className="block text-right text-sm text-muted-foreground">
          {row.original.usedCount.toLocaleString()}
          {row.original.maxUses !== null &&
            ` / ${row.original.maxUses.toLocaleString()}`}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge tone={row.original.isActive ? 'success' : 'neutral'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
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

export function DiscountsTable() {
  const {
    page,
    pageSize,
    filters,
    setPage,
    setPageSize,
    patchFilters,
    queryParams,
  } = useTableQueryState<DiscountsFilters>({ spec: FILTERS_SPEC });

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetDiscountsQuery(queryParams);
  const [updateDiscount] = useUpdateDiscountMutation();
  const [deleteDiscount] = useDeleteDiscountMutation();
  const { confirm, confirmDialog } = useConfirm();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<IDiscountRow | null>(null);

  const discounts = React.useMemo(() => data?.data ?? [], [data]);
  const totalCount = data?.pagination.totalItems ?? 0;
  const loading = isLoading || isFetching;

  const openCreate = React.useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const openEdit = React.useCallback((discount: IDiscountRow) => {
    setEditing(discount);
    setDialogOpen(true);
  }, []);

  const handleToggleActive = React.useCallback(
    async (discount: IDiscountRow) => {
      const activating = !discount.isActive;
      const ok = await confirm({
        title: activating
          ? 'Activate discount?'
          : 'Deactivate discount?',
        description: activating
          ? `"${discount.name}" starts applying to eligible bookings immediately.`
          : `"${discount.name}" stops applying immediately. Bookings that already used it keep their price.`,
        confirmText: activating ? 'Activate' : 'Deactivate',
        isDestructive: !activating,
      });
      if (!ok) return;
      try {
        await updateDiscount({
          id: discount.id,
          body: { isActive: activating },
        }).unwrap();
        toast.success(
          activating ? 'Discount activated' : 'Discount deactivated',
        );
      } catch (err) {
        toast.error(extractApiError(err).message);
      }
    },
    [confirm, updateDiscount],
  );

  const handleDelete = React.useCallback(
    async (discount: IDiscountRow) => {
      const ok = await confirm({
        title: 'Delete discount?',
        description: `"${discount.name}" is archived and stops applying. Past bookings keep their price.`,
        confirmText: 'Delete discount',
        isDestructive: true,
      });
      if (!ok) return;
      try {
        await deleteDiscount(discount.id).unwrap();
        toast.success('Discount deleted');
      } catch (err) {
        toast.error(extractApiError(err).message);
      }
    },
    [confirm, deleteDiscount],
  );

  const renderActions = React.useCallback(
    (discount: IDiscountRow) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${discount.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(discount)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleToggleActive(discount)}>
            <Eye />
            {discount.isActive ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => handleDelete(discount)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [openEdit, handleToggleActive, handleDelete],
  );

  const columns = React.useMemo(
    () => createColumns({ renderActions, onEdit: openEdit }),
    [renderActions, openEdit],
  );

  const table = useDataTable({
    columns,
    data: discounts,
    pageSize,
    totalCount,
    getRowId: (row) => row.id,
  });

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load discounts"
        description={extractApiError(error).message}
        onRetry={refetch}
      />
    );
  }

  const statusValue = filters.isActive ?? 'any';
  const nonSearchFilterCount = filters.isActive === undefined ? 0 : 1;

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
        entityLabel="discounts"
        emptyState={
          <EmptyState
            icon={TicketPercent}
            title="No discounts yet"
            description="Create a promo code guests type at checkout, or an automatic discount."
            buttonText="Add your first discount"
            buttonIcon={TicketPercent}
            onCreateClick={openCreate}
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
              searchPlaceholder="Search by name or code…"
              filterCount={nonSearchFilterCount}
              hasFiltersApplied={
                Boolean(filters.search) || filters.isActive !== undefined
              }
              onClearAll={() => patchFilters(clearAllFiltersPatch(filters))}
              // ONE filter -> inline beside the search, no Filters toggle.
              inlineFilter={
                <LabeledSelect
                  id="discounts-status-filter"
                  label="Filter by status"
                  srOnlyLabel
                  options={STATUS_OPTIONS}
                  value={statusValue}
                  onValueChange={(value) =>
                    patchFilters({
                      isActive:
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
                Boolean(filters.search) || filters.isActive !== undefined
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
              {filters.isActive !== undefined && (
                <FilterChip
                  icon={Eye}
                  onRemove={() => patchFilters({ isActive: undefined })}
                >
                  {filters.isActive === 'true' ? 'Active' : 'Inactive'}
                </FilterChip>
              )}
            </ActiveFilters>
          </div>
        }
        renderRowCard={(row) => {
          const discount = row.original;
          return (
            <RowCard
              onOpen={() => openEdit(discount)}
              action={renderActions(discount)}
            >
              <div className="flex items-center justify-between gap-2">
                <StatusBadge
                  tone={discount.isActive ? 'success' : 'neutral'}
                  className={ROW_BADGE}
                >
                  {discount.isActive ? 'Active' : 'Inactive'}
                </StatusBadge>
                <span className="flex-none text-xs font-semibold">
                  {formatDiscountValue(discount)}
                </span>
              </div>
              <div className="mt-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {discount.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {discount.code ?? 'Automatic'} ·{' '}
                  {discount.roomType?.name ?? 'All rooms'} ·{' '}
                  {windowLabel(discount)}
                </p>
              </div>
            </RowCard>
          );
        }}
      />

      <DiscountFormDialog
        discount={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      {confirmDialog}
    </>
  );
}

/** The "Add discount" header action that owns its own create dialog. */
export function AddDiscountButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <TicketPercent />
        Add discount
      </Button>
      <DiscountFormDialog
        discount={null}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
