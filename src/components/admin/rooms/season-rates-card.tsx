// src/components/admin/rooms/season-rates-card.tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  CalendarRange,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveFormDialog } from '@/components/ui/responsive-form-dialog';
import { SectionCard } from '@/components/admin/detail-bits';
import { TextField } from '@/components/forms/text-field';
import { useConfirm } from '@/hooks/use-confirm';
import {
  useCreateSeasonRateMutation,
  useUpdateSeasonRateMutation,
  useDeleteSeasonRateMutation,
} from '@/redux/rooms-api';
import { extractApiError } from '@/lib/extract-api-error';
import { formatDate } from '@/lib/format-date';
import { formatMoney } from '@/lib/format-money';
import type { IRoomTypeDetail, ISeasonRateRow } from '@/types/room.types';

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date');

/** Mirrors validations/hotel-validation.ts (seasonRateCreateSchema). */
const rateFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Name the season').max(150),
    startDate: dateOnly,
    endDate: dateOnly,
    nightlyPrice: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, 'Enter the price in GHS, e.g. 650')
      .transform((v) => Math.round(parseFloat(v) * 100))
      .refine((v) => v >= 1, { message: 'Too low' }),
    minNights: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (!v) return undefined;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 90) {
          ctx.addIssue({
            code: 'custom',
            message: 'Enter a whole number between 1 and 90',
          });
          return z.NEVER;
        }
        return n;
      }),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after the start date',
    path: ['endDate'],
  });

type RateFormInput = z.input<typeof rateFormSchema>;
type RateFormOutput = z.output<typeof rateFormSchema>;

const BLANK_RATE: RateFormInput = {
  name: '',
  startDate: '',
  endDate: '',
  nightlyPrice: '',
  minNights: '',
};

function RateFormDialog({
  roomTypeId,
  rate,
  open,
  onOpenChange,
}: {
  roomTypeId: string;
  /** Present = edit mode; absent = create. */
  rate: ISeasonRateRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [createRate, { isLoading: isCreating }] =
    useCreateSeasonRateMutation();
  const [updateRate, { isLoading: isUpdating }] =
    useUpdateSeasonRateMutation();
  const isLoading = isCreating || isUpdating;

  const form = useForm<RateFormInput, unknown, RateFormOutput>({
    resolver: zodResolver(rateFormSchema),
    defaultValues: BLANK_RATE,
  });

  React.useEffect(() => {
    if (open) {
      form.reset(
        rate
          ? {
              name: rate.name,
              startDate: rate.startDate.slice(0, 10),
              endDate: rate.endDate.slice(0, 10),
              nightlyPrice: String(rate.nightlyPrice / 100),
              minNights:
                rate.minNights === null ? '' : String(rate.minNights),
            }
          : BLANK_RATE,
      );
    }
  }, [open, rate, form]);

  const onSubmit = async (data: RateFormOutput) => {
    try {
      if (rate) {
        await updateRate({
          id: rate.id,
          roomTypeId,
          body: {
            name: data.name,
            startDate: data.startDate,
            endDate: data.endDate,
            nightlyPrice: data.nightlyPrice,
            // An emptied field clears the season's own minimum.
            minNights: data.minNights ?? null,
          },
        }).unwrap();
        toast.success('Season rate updated');
      } else {
        await createRate({
          roomTypeId,
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          nightlyPrice: data.nightlyPrice,
          minNights: data.minNights,
        }).unwrap();
        toast.success('Season rate added');
      }
      onOpenChange(false);
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          form.setError(field as keyof RateFormInput, { message: msg });
        }
      }
      toast.error(message);
    }
  };

  const { register, formState } = form;

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={rate ? `Edit ${rate.name}` : 'Add season rate'}
      description="Overrides the nightly price for stays inside this date range."
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              label="Season name"
              placeholder="e.g. Christmas Peak"
              error={formState.errors.name?.message}
              {...register('name')}
            />
          </div>
          <TextField
            label="Start date"
            type="date"
            error={formState.errors.startDate?.message}
            {...register('startDate')}
          />
          <TextField
            label="End date"
            type="date"
            hint="Exclusive - the night before this date is the last one covered."
            error={formState.errors.endDate?.message}
            {...register('endDate')}
          />
          <TextField
            label="Nightly price (GHS)"
            inputMode="decimal"
            placeholder="650.00"
            error={formState.errors.nightlyPrice?.message}
            {...register('nightlyPrice')}
          />
          <TextField
            label="Minimum nights (optional)"
            inputMode="numeric"
            hint="Overrides the room's minimum inside this season."
            error={formState.errors.minNights?.message}
            {...register('minNights')}
          />
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="animate-spin" />}
            {isLoading
              ? 'Saving…'
              : rate
                ? 'Save changes'
                : 'Add rate'}
          </Button>
        </div>
      </form>
    </ResponsiveFormDialog>
  );
}

/** The Rates tab: seasonal price overrides for this room type. */
export function SeasonRatesCard({
  roomType,
}: {
  roomType: IRoomTypeDetail;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRate, setEditingRate] = React.useState<ISeasonRateRow | null>(
    null,
  );
  const [deleteRate] = useDeleteSeasonRateMutation();
  const { confirm, confirmDialog } = useConfirm();

  const openCreate = () => {
    setEditingRate(null);
    setDialogOpen(true);
  };

  const openEdit = (rate: ISeasonRateRow) => {
    setEditingRate(rate);
    setDialogOpen(true);
  };

  const handleDelete = async (rate: ISeasonRateRow) => {
    const ok = await confirm({
      title: 'Delete season rate?',
      description: `Stays inside "${rate.name}" go back to the room's base price.`,
      confirmText: 'Delete rate',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deleteRate({ id: rate.id, roomTypeId: roomType.id }).unwrap();
      toast.success('Season rate deleted');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  return (
    <SectionCard
      title="Season rates"
      description="Date-ranged price overrides - the strictest minimum-nights rule wins."
      actions={
        <Button variant="outline" onClick={openCreate}>
          <Plus />
          Add rate
        </Button>
      }
    >
      {roomType.seasonRates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No season rates - every night is charged at the base price of{' '}
          {formatMoney(roomType.basePrice, roomType.currency)}.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {roomType.seasonRates.map((rate) => (
            <li
              key={rate.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CalendarRange
                    className="h-4 w-4 flex-none text-brand"
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                    {rate.name}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDate(rate.startDate)} - {formatDate(rate.endDate)}
                  {rate.minNights ? ` · min ${rate.minNights} nights` : ''}
                </p>
              </div>
              <div className="flex flex-none items-center gap-2 self-start sm:self-auto">
                <span className="text-sm font-semibold whitespace-nowrap">
                  {formatMoney(rate.nightlyPrice, roomType.currency)}
                  <span className="font-normal text-muted-foreground">
                    /night
                  </span>
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${rate.name}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(rate)}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleDelete(rate)}
                    >
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RateFormDialog
        roomTypeId={roomType.id}
        rate={editingRate}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      {confirmDialog}
    </SectionCard>
  );
}
