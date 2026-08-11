// src/components/admin/rooms/room-units-card.tsx
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  RefreshCw,
  DoorOpen,
  Link2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveFormDialog } from '@/components/ui/responsive-form-dialog';
import { SectionCard } from '@/components/admin/detail-bits';
import { TextField, TextAreaField } from '@/components/forms/text-field';
import { LabeledSelect } from '@/components/forms/labeled-select';
import { useConfirm } from '@/hooks/use-confirm';
import {
  useCreateRoomUnitMutation,
  useUpdateRoomUnitMutation,
  useDeleteRoomUnitMutation,
  useSyncRoomIcalMutation,
} from '@/redux/rooms-api';
import { extractApiError } from '@/lib/extract-api-error';
import { formatDateTime } from '@/lib/format-date';
import {
  ROOM_UNIT_STATUSES,
  ROOM_UNIT_STATUS_LABEL,
  type IRoomTypeDetail,
  type IRoomUnitRow,
} from '@/types/room.types';

/** Mirrors validations/hotel-validation.ts (roomCreateSchema). */
const unitFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter the unit name').max(100),
  floor: z.string().trim().max(50),
  status: z.enum(['ACTIVE', 'MAINTENANCE']),
  notes: z.string().trim().max(500),
  airbnbIcalUrl: z.union([
    z.literal(''),
    z.url('Enter a valid calendar URL').max(500),
  ]),
});

type UnitFormValues = z.infer<typeof unitFormSchema>;

const BLANK_UNIT: UnitFormValues = {
  name: '',
  floor: '',
  status: 'ACTIVE',
  notes: '',
  airbnbIcalUrl: '',
};

const STATUS_OPTIONS = ROOM_UNIT_STATUSES.map((status) => ({
  value: status,
  label: ROOM_UNIT_STATUS_LABEL[status],
}));

function UnitFormDialog({
  roomTypeId,
  unit,
  open,
  onOpenChange,
}: {
  roomTypeId: string;
  /** Present = edit mode; absent = create. */
  unit: IRoomUnitRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [createUnit, { isLoading: isCreating }] = useCreateRoomUnitMutation();
  const [updateUnit, { isLoading: isUpdating }] = useUpdateRoomUnitMutation();
  const isLoading = isCreating || isUpdating;

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    mode: 'onTouched',
    defaultValues: BLANK_UNIT,
  });

  // Each open starts from the record being edited (or a clean form).
  React.useEffect(() => {
    if (open) {
      form.reset(
        unit
          ? {
              name: unit.name,
              floor: unit.floor ?? '',
              status: unit.status,
              notes: unit.notes ?? '',
              airbnbIcalUrl: unit.airbnbIcalUrl ?? '',
            }
          : BLANK_UNIT,
      );
    }
  }, [open, unit, form]);

  const onSubmit = async (data: UnitFormValues) => {
    try {
      if (unit) {
        await updateUnit({
          id: unit.id,
          roomTypeId,
          body: {
            name: data.name,
            floor: data.floor || undefined,
            status: data.status,
            notes: data.notes || undefined,
            // An emptied field clears the saved calendar link.
            airbnbIcalUrl: data.airbnbIcalUrl || null,
          },
        }).unwrap();
        toast.success('Unit updated');
      } else {
        await createUnit({
          roomTypeId,
          name: data.name,
          floor: data.floor || undefined,
          status: data.status,
          notes: data.notes || undefined,
          airbnbIcalUrl: data.airbnbIcalUrl || undefined,
        }).unwrap();
        toast.success('Unit added');
      }
      onOpenChange(false);
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          form.setError(field as keyof UnitFormValues, { message: msg });
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
      title={unit ? `Edit ${unit.name}` : 'Add unit'}
      description="A physical, bookable room of this type."
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            label="Unit name"
            placeholder="e.g. Room 101"
            error={formState.errors.name?.message}
            {...register('name')}
          />
          <TextField
            label="Floor (optional)"
            placeholder="e.g. 1st floor"
            error={formState.errors.floor?.message}
            {...register('floor')}
          />
          <Controller
            name="status"
            control={form.control}
            render={({ field }) => (
              <LabeledSelect
                id="unit-status"
                label="Status"
                options={STATUS_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
                error={formState.errors.status?.message}
              />
            )}
          />
          <div className="sm:col-span-2">
            <TextField
              label="Airbnb calendar URL (optional)"
              type="url"
              placeholder="https://airbnb.com/calendar/ical/…"
              hint="When set, its busy dates sync in so double-booking across platforms is impossible."
              error={formState.errors.airbnbIcalUrl?.message}
              {...register('airbnbIcalUrl')}
            />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField
              label="Notes (optional)"
              rows={2}
              error={formState.errors.notes?.message}
              {...register('notes')}
            />
          </div>
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
              : unit
                ? 'Save changes'
                : 'Add unit'}
          </Button>
        </div>
      </form>
    </ResponsiveFormDialog>
  );
}

/** The Units tab: every physical room of this type, with iCal tooling. */
export function RoomUnitsCard({ roomType }: { roomType: IRoomTypeDetail }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingUnit, setEditingUnit] = React.useState<IRoomUnitRow | null>(
    null,
  );
  const [deleteUnit] = useDeleteRoomUnitMutation();
  const [syncIcal, { isLoading: isSyncing }] = useSyncRoomIcalMutation();
  const { confirm, confirmDialog } = useConfirm();

  const openCreate = () => {
    setEditingUnit(null);
    setDialogOpen(true);
  };

  const openEdit = (unit: IRoomUnitRow) => {
    setEditingUnit(unit);
    setDialogOpen(true);
  };

  const handleDelete = async (unit: IRoomUnitRow) => {
    const ok = await confirm({
      title: 'Delete unit?',
      description: `This archives ${unit.name}. Units with active bookings cannot be deleted.`,
      confirmText: 'Delete unit',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deleteUnit({ id: unit.id, roomTypeId: roomType.id }).unwrap();
      toast.success('Unit deleted');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  const handleSync = async (unit: IRoomUnitRow) => {
    try {
      await syncIcal({ id: unit.id, roomTypeId: roomType.id }).unwrap();
      toast.success(`${unit.name} calendar synced`);
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  const copyExportLink = async (unit: IRoomUnitRow) => {
    const url = `${window.location.origin}/api/ical/${unit.icalToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('iCal export link copied - paste it into Airbnb.');
    } catch {
      toast.error(`Could not copy. The link is: ${url}`);
    }
  };

  return (
    <SectionCard
      title="Units"
      description="The physical rooms guests are assigned to. Availability is per unit."
      actions={
        <Button variant="outline" onClick={openCreate}>
          <Plus />
          Add unit
        </Button>
      }
    >
      {roomType.units.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No units yet - the room cannot be booked until at least one
          active unit exists.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {roomType.units.map((unit) => (
            <li
              key={unit.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DoorOpen
                    className="h-4 w-4 flex-none text-brand"
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                    {unit.name}
                  </span>
                  <StatusBadge
                    tone={unit.status === 'ACTIVE' ? 'success' : 'warning'}
                  >
                    {ROOM_UNIT_STATUS_LABEL[unit.status]}
                  </StatusBadge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  {unit.floor ? `${unit.floor} · ` : ''}
                  {unit.airbnbIcalUrl
                    ? unit.icalLastSyncedAt
                      ? `Airbnb synced ${formatDateTime(unit.icalLastSyncedAt)}`
                      : 'Airbnb linked - not synced yet'
                    : 'No Airbnb calendar linked'}
                </p>
              </div>
              <div className="flex flex-none items-center gap-1 self-start sm:self-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${unit.name}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(unit)}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    {unit.airbnbIcalUrl && (
                      <DropdownMenuItem
                        onClick={() => handleSync(unit)}
                        disabled={isSyncing}
                      >
                        <RefreshCw />
                        Sync Airbnb calendar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => copyExportLink(unit)}>
                      <Link2 />
                      Copy iCal export link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleDelete(unit)}
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

      <UnitFormDialog
        roomTypeId={roomType.id}
        unit={editingUnit}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      {confirmDialog}
    </SectionCard>
  );
}
