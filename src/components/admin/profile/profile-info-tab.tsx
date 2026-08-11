// src/components/admin/profile/profile-info-tab.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { toast } from 'sonner';
import {
  Camera,
  Loader2,
  Pencil,
  Save,
  X,
  ZoomIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { ROLE_TONE } from '@/components/admin/users/columns';
import {
  updateProfile,
  updateProfilePhoto,
  removeProfilePhoto,
} from '@/lib/account';
import { optimizeImage } from '@/lib/optimize-image';
import { MAX_UPLOAD_BYTES } from '@/lib/uploads-shared';
import { initials } from '@/lib/initials';
import { cn } from '@/lib/utils';
import { USER_ROLE_LABEL, type UserRoleValue } from '@/types/user.types';

export interface ProfileUser {
  fullname: string;
  email: string;
  phone: string | null;
  role: UserRoleValue;
  photoUrl: string | null;
}

/** dms input treatment: calm muted fill at rest, alive while editing. */
const inputCls = (active: boolean) =>
  cn(
    'h-11 font-medium transition-all duration-200',
    active
      ? 'border-brand/40 bg-background focus:border-brand'
      : 'border-border bg-muted/50 text-foreground',
  );

/**
 * The dms ProfileInfoTab, ported: an avatar band (photo with staged
 * preview, hover zoom, camera control, confirmed remove, full-size
 * viewer) over the profile form, whose fields stay read-only until
 * Edit Profile is clicked.
 */
export function ProfileInfoTab({ user }: { user: ProfileUser }) {
  const router = useRouter();

  // ---- avatar state ----
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const [photoPending, startPhoto] = React.useTransition();

  // ---- form state ----
  const [editing, setEditing] = React.useState(false);
  const [fullname, setFullname] = React.useState(user.fullname);
  const [phone, setPhone] = React.useState(user.phone ?? '');
  const [errors, setErrors] = React.useState<{
    fullname?: string[];
    phone?: string[];
  }>({});
  const [formPending, startForm] = React.useTransition();

  const clearPreview = React.useCallback(() => {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

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

  const handleSavePhoto = () => {
    if (!file) return;
    startPhoto(async () => {
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

  const handleRemovePhoto = () =>
    startPhoto(async () => {
      const r = await removeProfilePhoto();
      if (r.success) {
        toast.success(r.message ?? 'Profile photo removed.');
        setRemoveOpen(false);
        router.refresh();
      } else {
        toast.error(r.error ?? 'Could not remove the photo.');
      }
    });

  const handleCancelEdit = () => {
    setFullname(user.fullname);
    setPhone(user.phone ?? '');
    setErrors({});
    setEditing(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startForm(async () => {
      const formData = new FormData();
      formData.set('fullname', fullname);
      formData.set('phone', phone);
      const r = await updateProfile({ success: false }, formData);
      if (r.success) {
        toast.success(r.message ?? 'Profile updated.');
        setErrors({});
        setEditing(false);
        router.refresh();
      } else {
        setErrors(r.errors ?? {});
        toast.error(r.errors?._form?.[0] ?? 'Check the highlighted fields.');
      }
    });
  };

  const imageSrc = preview ?? user.photoUrl;
  const busy = photoPending || processing;

  return (
    <div className="@container border border-border bg-card p-4 sm:p-6">
      {/* ---- Avatar band ---- */}
      <div className="flex flex-col items-center gap-6 bg-muted p-5 sm:flex-row">
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
            aria-label={
              imageSrc ? 'View photo full size' : 'No profile photo yet'
            }
            onClick={imageSrc ? () => setViewerOpen(true) : undefined}
            className={cn(
              'relative grid h-24 w-24 place-items-center overflow-hidden rounded-full ring-4 transition-all',
              preview ? 'ring-brand' : 'ring-brand/20',
              imageSrc ? 'cursor-pointer' : 'cursor-default bg-brand',
            )}
          >
            {imageSrc ? (
              <>
                <Image
                  src={imageSrc}
                  alt={user.fullname}
                  fill
                  sizes="96px"
                  className="object-cover"
                  // Local object-URL previews can't go through the optimizer.
                  unoptimized={imageSrc.startsWith('blob:')}
                />
                <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <ZoomIn className="h-7 w-7 text-white" />
                </span>
              </>
            ) : (
              <span className="font-heading text-2xl font-bold text-brand-foreground">
                {initials(user.fullname)}
              </span>
            )}
            {processing && (
              <span className="absolute inset-0 grid place-items-center rounded-full bg-background/80">
                <Loader2 className="h-7 w-7 animate-spin text-brand" />
              </span>
            )}
          </button>

          {!preview && !processing && (
            <Button
              type="button"
              size="icon-sm"
              aria-label="Change profile photo"
              className="absolute -right-2 -bottom-2 h-9 w-9 rounded-full"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <Camera className="h-4 w-4" />
            </Button>
          )}

          {preview && !processing && (
            <>
              <Button
                type="button"
                size="icon-sm"
                variant="destructive"
                aria-label="Discard new photo"
                className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                onClick={clearPreview}
                disabled={busy}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-brand px-2.5 py-0.5 text-xs font-semibold text-brand-foreground">
                New
              </span>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="mb-2 flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
            <p className="min-w-0 text-base font-medium text-foreground [overflow-wrap:anywhere]">
              {user.fullname}
            </p>
            <StatusBadge tone={ROLE_TONE[user.role]}>
              {USER_ROLE_LABEL[user.role]}
            </StatusBadge>
          </div>

          <div className="flex items-center justify-center gap-2 sm:justify-start">
            {!preview && !processing && (
              <Camera
                aria-hidden
                className="h-4 w-4 shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-brand"
                onClick={() => inputRef.current?.click()}
              />
            )}
            <p className="text-xs text-muted-foreground">
              {processing
                ? 'Processing image, please wait…'
                : preview
                  ? 'New photo staged - nothing is saved until you click Save.'
                  : imageSrc
                    ? 'Click the photo to view it full size, or the camera to change it.'
                    : 'Use the camera to upload a photo (max 5MB, JPG, PNG or WebP).'}
            </p>
          </div>

          {preview && !processing && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button size="sm" onClick={handleSavePhoto} disabled={busy}>
                {photoPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save />
                )}
                {photoPending ? 'Saving…' : 'Save picture'}
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
          )}

          {!preview && !processing && user.photoUrl && (
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
          )}
        </div>
      </div>

      {/* ---- Profile form (read-only until Edit Profile) ---- */}
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 @xl:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-fullname">Full name</Label>
            <Input
              id="profile-fullname"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              disabled={!editing || formPending}
              aria-invalid={!!errors.fullname}
              className={inputCls(editing)}
            />
            {errors.fullname && (
              <p className="text-xs text-destructive">{errors.fullname[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-phone">Phone</Label>
            <Input
              id="profile-phone"
              type="tel"
              placeholder="024 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!editing || formPending}
              aria-invalid={!!errors.phone}
              className={inputCls(editing)}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone[0]}</p>
            )}
          </div>

          <div className="space-y-2 @xl:col-span-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              value={user.email}
              disabled
              className={inputCls(false)}
            />
            <p className="text-xs text-muted-foreground">
              Your sign-in email is managed by a super admin.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {!editing ? (
            <Button type="button" onClick={() => setEditing(true)}>
              <Pencil />
              Edit profile
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={formPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formPending}>
                {formPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save />
                )}
                {formPending ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove profile photo?"
        description="Your photo is deleted and the initials avatar takes its place."
        confirmText="Remove photo"
        isDestructive
        loading={photoPending}
        onConfirm={handleRemovePhoto}
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
                {user.fullname}
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
                  alt={user.fullname}
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
