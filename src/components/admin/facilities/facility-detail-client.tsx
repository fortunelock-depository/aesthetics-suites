// src/components/admin/facilities/facility-detail-client.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ExternalLink,
  Eye,
  EyeOff,
  ImageIcon,
  Images,
  Info,
  Loader2,
  Pencil,
  Save,
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
import { PhotosManager } from '@/components/admin/photos-manager';
import { useConfirm } from '@/hooks/use-confirm';
import {
  useGetFacilityQuery,
  useUpdateFacilityMutation,
  useDeleteFacilityMutation,
  useAddFacilityPhotosMutation,
  useDeleteFacilityPhotoMutation,
} from '@/redux/facilities-api';
import { extractApiError } from '@/lib/extract-api-error';
import type { IFacilityDetail } from '@/types/facility.types';
import {
  FacilityFields,
  facilityFormSchema,
  facilityToFormDefaults,
  toFacilityBody,
  type FacilityFormInput,
  type FacilityFormOutput,
} from './facility-form';
import { facilityDetail } from '@/lib/routes';

/** The Details tab: full field grid, read-only until Edit is clicked. */
function FacilityDetailsCard({ facility }: { facility: IFacilityDetail }) {
  const [editing, setEditing] = React.useState(false);
  const [updateFacility, { isLoading }] = useUpdateFacilityMutation();

  const form = useForm<FacilityFormInput, unknown, FacilityFormOutput>({
    resolver: zodResolver(facilityFormSchema),
    defaultValues: facilityToFormDefaults(facility),
  });

  const handleCancel = () => {
    form.reset(facilityToFormDefaults(facility));
    setEditing(false);
  };

  const onSubmit = async (data: FacilityFormOutput) => {
    try {
      await updateFacility({
        id: facility.id,
        body: {
          ...toFacilityBody(data),
          // An emptied field clears the saved hours.
          openingHours: data.openingHours || null,
        },
      }).unwrap();
      toast.success('Facility updated');
      setEditing(false);
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          form.setError(field as keyof FacilityFormInput, { message: msg });
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
        <FacilityFields form={form} active={editing} busy={isLoading} />
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

function FacilityPhotosCard({ facility }: { facility: IFacilityDetail }) {
  const [addPhotos, { isLoading: isUploading }] =
    useAddFacilityPhotosMutation();
  const [deletePhoto, { isLoading: isDeleting }] =
    useDeleteFacilityPhotoMutation();

  return (
    <PhotosManager
      photos={facility.photos}
      entityName={facility.name}
      description="The first photo is the cover on the interlocking rows and detail banner."
      uploading={isUploading}
      deleting={isDeleting}
      onUpload={(formData) =>
        addPhotos({ id: facility.id, formData }).unwrap()
      }
      onDelete={(photoId) =>
        deletePhoto({ facilityId: facility.id, photoId }).unwrap()
      }
    />
  );
}

/**
 * One facility end to end: identity banner, Details (read-only until
 * edit) and Photos tabs, with confirmed publish/unpublish and delete.
 */
export function FacilityDetailClient({ facilityId }: { facilityId: string }) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } =
    useGetFacilityQuery(facilityId);
  const [updateFacility, { isLoading: isToggling }] =
    useUpdateFacilityMutation();
  const [deleteFacility, { isLoading: isDeleting }] =
    useDeleteFacilityMutation();
  const { confirm, confirmDialog } = useConfirm();

  if (isLoading) return <BandedDetailSkeleton tabs={2} />;

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <BackLink href="/admin/facilities" label="All facilities" />
        <ErrorState
          title="Couldn't load facility"
          description={extractApiError(error).message}
          onRetry={refetch}
        />
      </div>
    );
  }

  const facility = data.data;
  const cover = facility.photos[0];

  const handleTogglePublish = async () => {
    const publishing = !facility.isPublished;
    const ok = await confirm({
      title: publishing ? 'Publish facility?' : 'Unpublish facility?',
      description: publishing
        ? `"${facility.name}" goes live on the public site immediately.`
        : `"${facility.name}" disappears from the public site.`,
      confirmText: publishing ? 'Publish' : 'Unpublish',
      isDestructive: !publishing,
    });
    if (!ok) return;
    try {
      await updateFacility({
        id: facility.id,
        body: { isPublished: publishing },
      }).unwrap();
      toast.success(publishing ? 'Facility published' : 'Facility unpublished');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  const handleDelete = async () => {
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
      router.push('/admin/facilities');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/admin/facilities" label="All facilities" />
      <PageHeader
        title={facility.name}
        description={facility.summary}
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleTogglePublish}
              disabled={isToggling}
            >
              {facility.isPublished ? <EyeOff /> : <Eye />}
              {facility.isPublished ? 'Unpublish' : 'Publish'}
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

      {/* Identity banner. */}
      <div className="border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col items-center gap-5 bg-muted p-5 sm:flex-row">
          <div className="relative grid h-24 w-32 flex-none place-items-center overflow-hidden bg-background">
            {cover ? (
              <Image
                src={cover.url}
                alt={cover.alt ?? facility.name}
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
                {facility.name}
              </p>
              <StatusBadge
                tone={facility.isPublished ? 'success' : 'neutral'}
              >
                {facility.isPublished ? 'Published' : 'Draft'}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {facility.eyebrow}
              {facility.openingHours && ` · ${facility.openingHours}`}
            </p>
            {facility.isPublished && (
              <Link
                href={facilityDetail(facility.slug)}
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
        <TabsList className="mb-4 grid w-full grid-cols-2 lg:mb-6">
          <TabsTrigger value="details">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
          <TabsTrigger value="photos">
            <Images className="h-4 w-4" />
            <span className="hidden sm:inline">Photos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-0">
          {/* Remount on fresh data so the fields resync after a save. */}
          <FacilityDetailsCard
            key={facility.updatedAt}
            facility={facility}
          />
        </TabsContent>
        <TabsContent value="photos" className="mt-0">
          <FacilityPhotosCard facility={facility} />
        </TabsContent>
      </Tabs>

      {confirmDialog}
    </section>
  );
}
