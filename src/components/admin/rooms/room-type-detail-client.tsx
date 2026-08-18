// src/components/admin/rooms/room-type-detail-client.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CalendarRange,
  DoorOpen,
  ExternalLink,
  Eye,
  EyeOff,
  ImageIcon,
  Images,
  Info,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { BackLink } from '@/components/admin/back-link';
import { BandedDetailSkeleton } from '@/components/admin/detail-skeletons';
import { ErrorState } from '@/components/ui/error-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useConfirm } from '@/hooks/use-confirm';
import {
  useGetRoomTypeQuery,
  useUpdateRoomTypeMutation,
  useDeleteRoomTypeMutation,
} from '@/redux/rooms-api';
import { extractApiError } from '@/lib/extract-api-error';
import { formatMoney } from '@/lib/format-money';
import { RoomTypeDetailsCard } from './room-type-details-card';
import { RoomPhotosCard } from './room-photos-card';
import { RoomUnitsCard } from './room-units-card';
import { SharedUnitsCard } from './shared-units-card';
import { SeasonRatesCard } from './season-rates-card';
import { roomDetail } from '@/lib/routes';

/**
 * One room type end to end: identity banner, then tabs for the details
 * form (read-only until edit), the photo gallery, the physical units
 * (with iCal tooling) and the seasonal price overrides.
 */
export function RoomTypeDetailClient({ roomTypeId }: { roomTypeId: string }) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } =
    useGetRoomTypeQuery(roomTypeId);
  const [updateRoomType, { isLoading: isToggling }] =
    useUpdateRoomTypeMutation();
  const [deleteRoomType, { isLoading: isDeleting }] =
    useDeleteRoomTypeMutation();
  const { confirm, confirmDialog } = useConfirm();

  if (isLoading) return <BandedDetailSkeleton tabs={4} />;

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <BackLink href="/admin/rooms" label="All rooms" />
        <ErrorState
          title="Couldn't load room"
          description={extractApiError(error).message}
          onRetry={refetch}
        />
      </div>
    );
  }

  const roomType = data.data;
  const cover = roomType.photos[0];

  const handleTogglePublish = async () => {
    const publishing = !roomType.isPublished;
    const ok = await confirm({
      title: publishing ? 'Publish room?' : 'Unpublish room?',
      description: publishing
        ? `"${roomType.name}" goes live on the public site immediately.`
        : `"${roomType.name}" disappears from the public site. Existing bookings are unaffected.`,
      confirmText: publishing ? 'Publish' : 'Unpublish',
      isDestructive: !publishing,
    });
    if (!ok) return;
    try {
      await updateRoomType({
        id: roomType.id,
        body: { isPublished: publishing },
      }).unwrap();
      toast.success(publishing ? 'Room published' : 'Room unpublished');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  const handleDelete = async () => {
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
      router.push('/admin/rooms');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/admin/rooms" label="All rooms" />
      <PageHeader
        title={roomType.name}
        description={roomType.summary}
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleTogglePublish}
              disabled={isToggling}
            >
              {roomType.isPublished ? <EyeOff /> : <Eye />}
              {roomType.isPublished ? 'Unpublish' : 'Publish'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 />
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      />

      {/* Identity banner (the dms avatar-band shape). */}
      <div className="border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col items-center gap-5 bg-muted p-5 sm:flex-row">
          <div className="relative grid h-24 w-32 flex-none place-items-center overflow-hidden bg-background">
            {cover ? (
              <Image
                src={cover.url}
                alt={cover.alt ?? roomType.name}
                fill
                sizes="128px"
                className="object-cover"
              />
            ) : (
              <ImageIcon
                className="h-6 w-6 text-muted-foreground"
                aria-hidden
              />
            )}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
              <p className="min-w-0 text-base font-medium text-foreground [overflow-wrap:anywhere]">
                {roomType.name}
              </p>
              <StatusBadge
                tone={roomType.isPublished ? 'success' : 'neutral'}
              >
                {roomType.isPublished ? 'Published' : 'Draft'}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              From{' '}
              <span className="font-semibold text-foreground">
                {formatMoney(roomType.basePrice, roomType.currency)}
              </span>
              /night · {roomType.units.length + roomType.sharedUnits.length}{' '}
              unit
              {roomType.units.length + roomType.sharedUnits.length === 1
                ? ''
                : 's'}{' '}
              · sleeps{' '}
              {roomType.capacityAdults}
              {roomType.capacityChildren > 0 &&
                ` + ${roomType.capacityChildren} children`}
            </p>
            {roomType.isPublished && (
              <Link
                href={roomDetail(roomType.slug)}
                target="_blank"
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand-text hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View public page
              </Link>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="mb-4 grid w-full grid-cols-4 lg:mb-6">
          <TabsTrigger value="details">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
          <TabsTrigger value="photos">
            <Images className="h-4 w-4" />
            <span className="hidden sm:inline">Photos</span>
          </TabsTrigger>
          <TabsTrigger value="units">
            <DoorOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Units</span>
          </TabsTrigger>
          <TabsTrigger value="rates">
            <CalendarRange className="h-4 w-4" />
            <span className="hidden sm:inline">Rates</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-0">
          {/* Remount on fresh data so the fields resync after a save. */}
          <RoomTypeDetailsCard
            key={roomType.updatedAt}
            roomType={roomType}
          />
        </TabsContent>
        <TabsContent value="photos" className="mt-0">
          <RoomPhotosCard roomType={roomType} />
        </TabsContent>
        <TabsContent value="units" className="mt-0 space-y-6">
          <RoomUnitsCard roomType={roomType} />
          <SharedUnitsCard roomType={roomType} />
        </TabsContent>
        <TabsContent value="rates" className="mt-0">
          <SeasonRatesCard roomType={roomType} />
        </TabsContent>
      </Tabs>

      {confirmDialog}
    </section>
  );
}
