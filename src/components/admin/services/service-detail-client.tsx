// src/components/admin/services/service-detail-client.tsx
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
  useGetServiceQuery,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useAddServicePhotosMutation,
  useDeleteServicePhotoMutation,
} from '@/redux/services-api';
import { extractApiError } from '@/lib/extract-api-error';
import type { IServiceDetail } from '@/types/service.types';
import {
  ServiceFields,
  serviceFormSchema,
  serviceToFormDefaults,
  toServiceBody,
  type ServiceFormInput,
  type ServiceFormOutput,
} from './service-form';

/** The Details tab: full field grid, read-only until Edit is clicked. */
function ServiceDetailsCard({ service }: { service: IServiceDetail }) {
  const [editing, setEditing] = React.useState(false);
  const [updateService, { isLoading }] = useUpdateServiceMutation();

  const form = useForm<ServiceFormInput, unknown, ServiceFormOutput>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: serviceToFormDefaults(service),
  });

  const handleCancel = () => {
    form.reset(serviceToFormDefaults(service));
    setEditing(false);
  };

  const onSubmit = async (data: ServiceFormOutput) => {
    try {
      await updateService({
        id: service.id,
        body: {
          ...toServiceBody(data),
          // An emptied field clears the saved hours.
          availability: data.availability || null,
        },
      }).unwrap();
      toast.success('Service updated');
      setEditing(false);
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          form.setError(field as keyof ServiceFormInput, { message: msg });
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
        <ServiceFields form={form} active={editing} busy={isLoading} />
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

function ServicePhotosCard({ service }: { service: IServiceDetail }) {
  const [addPhotos, { isLoading: isUploading }] =
    useAddServicePhotosMutation();
  const [deletePhoto, { isLoading: isDeleting }] =
    useDeleteServicePhotoMutation();

  return (
    <PhotosManager
      photos={service.photos}
      entityName={service.name}
      description="The first photo is the cover on the interlocking rows and detail banner."
      uploading={isUploading}
      deleting={isDeleting}
      onUpload={(formData) =>
        addPhotos({ id: service.id, formData }).unwrap()
      }
      onDelete={(photoId) =>
        deletePhoto({ serviceId: service.id, photoId }).unwrap()
      }
    />
  );
}

/**
 * One service end to end: identity banner, Details (read-only until
 * edit) and Photos tabs, with confirmed publish/unpublish and delete.
 */
export function ServiceDetailClient({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } =
    useGetServiceQuery(serviceId);
  const [updateService, { isLoading: isToggling }] =
    useUpdateServiceMutation();
  const [deleteService, { isLoading: isDeleting }] =
    useDeleteServiceMutation();
  const { confirm, confirmDialog } = useConfirm();

  if (isLoading) return <BandedDetailSkeleton tabs={2} />;

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <BackLink href="/admin/services" label="All services" />
        <ErrorState
          title="Couldn't load service"
          description={extractApiError(error).message}
          onRetry={refetch}
        />
      </div>
    );
  }

  const service = data.data;
  const cover = service.photos[0];

  const handleTogglePublish = async () => {
    const publishing = !service.isPublished;
    const ok = await confirm({
      title: publishing ? 'Publish service?' : 'Unpublish service?',
      description: publishing
        ? `"${service.name}" goes live on the public site immediately.`
        : `"${service.name}" disappears from the public site.`,
      confirmText: publishing ? 'Publish' : 'Unpublish',
      isDestructive: !publishing,
    });
    if (!ok) return;
    try {
      await updateService({
        id: service.id,
        body: { isPublished: publishing },
      }).unwrap();
      toast.success(publishing ? 'Service published' : 'Service unpublished');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete service?',
      description: `This archives "${service.name}" and removes it from the public site.`,
      confirmText: 'Delete service',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deleteService(service.id).unwrap();
      toast.success('Service deleted');
      router.push('/admin/services');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/admin/services" label="All services" />
      <PageHeader
        title={service.name}
        description={service.summary}
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleTogglePublish}
              disabled={isToggling}
            >
              {service.isPublished ? <EyeOff /> : <Eye />}
              {service.isPublished ? 'Unpublish' : 'Publish'}
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

      {/* Identity banner (the dms band shape). */}
      <div className="border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col items-center gap-5 bg-muted p-5 sm:flex-row">
          <div className="relative grid h-24 w-32 flex-none place-items-center overflow-hidden bg-background">
            {cover ? (
              <Image
                src={cover.url}
                alt={cover.alt ?? service.name}
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
                {service.name}
              </p>
              <StatusBadge
                tone={service.isPublished ? 'success' : 'neutral'}
              >
                {service.isPublished ? 'Published' : 'Draft'}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {service.eyebrow}
              {service.availability && ` · ${service.availability}`}
            </p>
            {service.isPublished && (
              <Link
                href={`/services/${service.slug}`}
                target="_blank"
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand hover:underline"
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
          <ServiceDetailsCard
            key={service.updatedAt}
            service={service}
          />
        </TabsContent>
        <TabsContent value="photos" className="mt-0">
          <ServicePhotosCard service={service} />
        </TabsContent>
      </Tabs>

      {confirmDialog}
    </section>
  );
}
