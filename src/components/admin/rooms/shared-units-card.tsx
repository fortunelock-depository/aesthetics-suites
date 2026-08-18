// src/components/admin/rooms/shared-units-card.tsx
'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { DoorOpen, Link2Off, Loader2, Plus, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ResponsiveFormDialog } from '@/components/ui/responsive-form-dialog';
import { SectionCard } from '@/components/admin/detail-bits';
import { LabeledSelect } from '@/components/forms/labeled-select';
import { useConfirm } from '@/hooks/use-confirm';
import {
  useGetSharedUnitsQuery,
  useShareUnitMutation,
  useUnshareUnitMutation,
} from '@/redux/rooms-api';
import { extractApiError } from '@/lib/extract-api-error';
import {
  ROOM_UNIT_STATUS_LABEL,
  type IRoomTypeDetail,
  type ISharedUnitRow,
} from '@/types/room.types';

/** Picks one unit owned by a sibling listing and shares it into this one. */
function ShareUnitDialog({
  roomType,
  open,
  onOpenChange,
}: {
  roomType: IRoomTypeDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading: loadingCandidates } = useGetSharedUnitsQuery(
    roomType.id,
    { skip: !open },
  );
  const [shareUnit, { isLoading }] = useShareUnitMutation();
  const [roomId, setRoomId] = React.useState('');

  const candidates = data?.data.candidates ?? [];
  const options = candidates.map((unit) => ({
    value: unit.id,
    label: `${unit.name} · ${unit.roomType.name}`,
  }));

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roomId) {
      toast.error('Choose a unit to share.');
      return;
    }
    try {
      await shareUnit({ roomTypeId: roomType.id, roomId }).unwrap();
      toast.success('Unit shared - it now sells under this listing too');
      setRoomId('');
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setRoomId('');
        onOpenChange(next);
      }}
      title="Share a unit"
      description={`Sell a unit that belongs to another listing under "${roomType.name}" as well. A booking under either listing takes the whole unit.`}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {loadingCandidates ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading units…
          </div>
        ) : options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Every unit of the other listings is already shared here, or no
            other listing has units yet.
          </p>
        ) : (
          <LabeledSelect
            id="share-unit"
            label="Unit"
            placeholder="Choose a unit"
            options={options}
            value={roomId}
            onValueChange={setRoomId}
          />
        )}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || options.length === 0}>
            {isLoading && <Loader2 className="animate-spin" />}
            {isLoading ? 'Sharing…' : 'Share unit'}
          </Button>
        </div>
      </form>
    </ResponsiveFormDialog>
  );
}

/**
 * The shared-inventory half of the Units tab. Explains the apartment case
 * plainly (one physical apartment, sold whole under one listing and as a
 * single bedroom under another) and lists the units this listing sells but
 * does not own, with unlink.
 */
export function SharedUnitsCard({ roomType }: { roomType: IRoomTypeDetail }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [unshareUnit] = useUnshareUnitMutation();
  const { confirm, confirmDialog } = useConfirm();

  const handleUnshare = async (unit: ISharedUnitRow) => {
    const ok = await confirm({
      title: 'Stop selling this unit here?',
      description: `${unit.name} stays with ${unit.roomType.name}; it just stops being bookable as "${roomType.name}". Existing bookings are not affected.`,
      confirmText: 'Stop sharing',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await unshareUnit({ roomTypeId: roomType.id, roomId: unit.id }).unwrap();
      toast.success('Unit no longer shared');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  return (
    <SectionCard
      title="Shared units"
      description="Units owned by another listing that this one also sells - e.g. a two-bedroom apartment sold whole there and as one bedroom here. Booking either listing reserves the whole unit, so it can never be sold twice."
      actions={
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Plus />
          Share a unit
        </Button>
      }
    >
      {roomType.sharedUnits.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No shared units. Use this when the same physical space is sold in
          more than one way.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {roomType.sharedUnits.map((unit) => (
            <li
              key={unit.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Share2
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
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  <DoorOpen className="h-3.5 w-3.5 flex-none" aria-hidden />
                  Owned by {unit.roomType.name}
                  {unit.floor ? ` · ${unit.floor}` : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-start sm:self-auto"
                onClick={() => handleUnshare(unit)}
              >
                <Link2Off />
                Stop sharing
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ShareUnitDialog
        roomType={roomType}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      {confirmDialog}
    </SectionCard>
  );
}
