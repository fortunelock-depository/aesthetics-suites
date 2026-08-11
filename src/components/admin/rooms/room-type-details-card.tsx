// src/components/admin/rooms/room-type-details-card.tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Pencil, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpdateRoomTypeMutation } from '@/redux/rooms-api';
import { extractApiError } from '@/lib/extract-api-error';
import type { IRoomTypeDetail } from '@/types/room.types';
import {
  RoomTypeFields,
  roomTypeFormSchema,
  roomTypeToFormDefaults,
  toRoomTypeBody,
  type RoomTypeFormInput,
  type RoomTypeFormOutput,
} from './room-type-form';

/**
 * The Details tab: the full field grid, read-only (muted) until Edit is
 * clicked. Remounted by the parent on fresh data (key=updatedAt) so the
 * fields resync after every save.
 */
export function RoomTypeDetailsCard({
  roomType,
}: {
  roomType: IRoomTypeDetail;
}) {
  const [editing, setEditing] = React.useState(false);
  const [updateRoomType, { isLoading }] = useUpdateRoomTypeMutation();

  const form = useForm<RoomTypeFormInput, unknown, RoomTypeFormOutput>({
    resolver: zodResolver(roomTypeFormSchema),
    mode: 'onTouched',
    defaultValues: roomTypeToFormDefaults(roomType),
  });

  const handleCancel = () => {
    form.reset(roomTypeToFormDefaults(roomType));
    setEditing(false);
  };

  const onSubmit = async (data: RoomTypeFormOutput) => {
    try {
      await updateRoomType({
        id: roomType.id,
        body: {
          ...toRoomTypeBody(data),
          // An emptied field clears the saved link.
          airbnbUrl: data.airbnbUrl ?? null,
        },
      }).unwrap();
      toast.success('Room updated');
      setEditing(false);
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          form.setError(field as keyof RoomTypeFormInput, { message: msg });
        }
      }
      toast.error(message);
    }
  };

  return (
    <div className="@container border border-border bg-card p-4 sm:p-6">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        <RoomTypeFields form={form} active={editing} busy={isLoading} />
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {!editing ? (
            <Button type="button" onClick={() => setEditing(true)}>
              <Pencil />
              Edit details
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                {isLoading ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
