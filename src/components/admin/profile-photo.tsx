// src/components/admin/profile-photo.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { toast } from 'sonner';
import { Camera, Loader2, Save, X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { ROLE_TONE } from '@/components/admin/users/columns';
import { updateProfilePhoto, removeProfilePhoto } from '@/lib/account';
import { optimizeImage } from '@/lib/optimize-image';
import { MAX_UPLOAD_BYTES } from '@/lib/uploads-shared';
import { initials } from '@/lib/initials';
import { USER_ROLE_LABEL, type UserRoleValue } from '@/types/user.types';

/**
 * The dms avatar block: photo (or initials), hover camera control, staged
 * preview before anything uploads, save/cancel, a confirmed remove, and a
 * full-size viewer. Files are downscaled client-side before staging.
 */
export function ProfilePhotoCard({
  fullname,
  role,
  photoUrl,
}: {
  fullname: string;
  role: UserRoleValue;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const clearPreview = React.useCallback(() => {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  // Revoke the last object URL on unmount.
  React.useEffect(() => () => clearPreview(), [clearPreview]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    setProcessing(true);
    try {
      // Avatars render small - a tight downscale keeps uploads instant.
      const optimized = await optimizeImage(selected, 1024);
      if (optimized.size > MAX_UPLOAD_BYTES) {
        toast.error('That image is too large.');
        return;
      }
      clearPreview();
      setFile(optimized);
      setPreview(URL.createObjectURL(optimized));
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = () => {
    if (!file) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('photo', file);
      const r = await updateProfilePhoto(formData);
      if (r.success) {
        toast.success(r.message ?? 'Profile photo updated.');
        clearPreview();
        router.refresh();
      } else {
        toast.error(r.error ?? 'Could not update the photo.');
      }
    });
  };

  const handleRemove = () =>
    startTransition(async () => {
      const r = await removeProfilePhoto();
      if (r.success) {
        toast.success(r.message ?? 'Profile photo removed.');
        setRemoveOpen(false);
        router.refresh();
      } else {
        toast.error(r.error ?? 'Could not remove the photo.');
      }
    });

  const imageSrc = preview ?? photoUrl;
  const busy = pending || processing;

  return (
    <div className="border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="group relative flex-none">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={busy}
          />
          <button
            type="button"
            aria-label={imageSrc ? 'View photo full size' : 'Profile photo'}
            onClick={imageSrc ? () => setViewerOpen(true) : undefined}
            className={`relative grid h-24 w-24 place-items-center overflow-hidden rounded-full ring-2 ring-border ${
              imageSrc ? 'cursor-pointer' : 'cursor-default bg-brand'
            }`}
          >
            {imageSrc ? (
              <>
                <Image
                  src={imageSrc}
                  alt={fullname}
                  fill
                  sizes="96px"
                  className="object-cover"
                  // Local object-URL previews can't go through the optimizer.
                  unoptimized={imageSrc.startsWith('blob:')}
                />
                <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <ZoomIn className="h-6 w-6 text-white" />
                </span>
              </>
            ) : (
              <span className="font-heading text-2xl font-bold text-brand-foreground">
                {initials(fullname)}
              </span>
            )}
            {processing && (
              <span className="absolute inset-0 grid place-items-center rounded-full bg-background/80">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              </span>
            )}
          </button>

          {!preview && !processing && (
            <Button
              type="button"
              size="icon-sm"
              aria-label="Change profile photo"
              className="absolute -right-1 -bottom-1 rounded-full"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <Camera className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="min-w-0 text-center sm:text-left">
          <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
            <p className="min-w-0 font-medium text-foreground [overflow-wrap:anywhere]">
              {fullname}
            </p>
            <StatusBadge tone={ROLE_TONE[role]}>
              {USER_ROLE_LABEL[role]}
            </StatusBadge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {preview
              ? 'New photo staged - nothing is saved until you click Save.'
              : photoUrl
                ? 'Click the photo to view it full size.'
                : 'Use the camera button to add a photo (max 5MB).'}
          </p>

          {preview ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button size="sm" onClick={handleSave} disabled={busy}>
                {pending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save />
                )}
                {pending ? 'Saving…' : 'Save photo'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={clearPreview}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          ) : (
            photoUrl && (
              <div className="mt-3 flex justify-center sm:justify-start">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setRemoveOpen(true)}
                  disabled={busy}
                >
                  <X />
                  Remove photo
                </Button>
              </div>
            )
          )}
        </div>
      </div>

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove profile photo?"
        description="Your photo is deleted and the initials avatar takes its place."
        confirmText="Remove photo"
        isDestructive
        loading={pending}
        onConfirm={handleRemove}
      />

      <DialogPrimitive.Root open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70" />
          <DialogPrimitive.Content
            className="fixed top-1/2 left-1/2 z-50 w-[min(90vw,32rem)] -translate-x-1/2 -translate-y-1/2 border border-border bg-card p-4 outline-none"
            aria-describedby={undefined}
          >
            <div className="flex items-center justify-between gap-2">
              <DialogPrimitive.Title className="min-w-0 truncate font-semibold">
                {fullname}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close viewer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>
            <div className="relative mt-3 aspect-square w-full bg-muted">
              {imageSrc && (
                <Image
                  src={imageSrc}
                  alt={fullname}
                  fill
                  sizes="(max-width: 640px) 90vw, 512px"
                  className="object-cover"
                  unoptimized={imageSrc.startsWith('blob:')}
                />
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
