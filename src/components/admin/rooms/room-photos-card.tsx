// src/components/admin/rooms/room-photos-card.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { ImagePlus, Loader2, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/admin/detail-bits';
import { useConfirm } from '@/hooks/use-confirm';
import {
  useAddRoomTypePhotosMutation,
  useDeleteRoomTypePhotoMutation,
} from '@/redux/rooms-api';
import { extractApiError } from '@/lib/extract-api-error';
import { optimizeImage } from '@/lib/optimize-image';
import { MAX_UPLOAD_BYTES } from '@/lib/uploads-shared';
import type { IRoomTypeDetail } from '@/types/room.types';

interface StagedPhoto {
  file: File;
  previewUrl: string;
}

/**
 * Gallery manager: saved photos in a grid (first = the cover used on
 * cards), plus a staged batch of new files - downscaled client-side,
 * nothing uploads until "Upload" is clicked, so cancelling never orphans
 * an asset. Deletes are confirmed.
 */
export function RoomPhotosCard({ roomType }: { roomType: IRoomTypeDetail }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [staged, setStaged] = React.useState<StagedPhoto[]>([]);
  const [processing, setProcessing] = React.useState(false);
  const [addPhotos, { isLoading: isUploading }] =
    useAddRoomTypePhotosMutation();
  const [deletePhoto, { isLoading: isDeleting }] =
    useDeleteRoomTypePhotoMutation();
  const { confirm, confirmDialog } = useConfirm();

  const clearStaged = React.useCallback(() => {
    setStaged((current) => {
      current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  React.useEffect(() => () => clearStaged(), [clearStaged]);

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const additions: StagedPhoto[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(`"${file.name}" is not an image.`);
          continue;
        }
        const optimized = await optimizeImage(file);
        if (optimized.size > MAX_UPLOAD_BYTES) {
          toast.error(`"${file.name}" is too large.`);
          continue;
        }
        additions.push({
          file: optimized,
          previewUrl: URL.createObjectURL(optimized),
        });
      }
      if (additions.length > 0) setStaged((s) => [...s, ...additions]);
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeStaged = (index: number) => {
    setStaged((current) => {
      URL.revokeObjectURL(current[index].previewUrl);
      return current.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (staged.length === 0) return;
    const formData = new FormData();
    staged.forEach((p) => formData.append('photos', p.file));
    try {
      await addPhotos({ id: roomType.id, formData }).unwrap();
      toast.success(
        `${staged.length} photo${staged.length === 1 ? '' : 's'} uploaded`,
      );
      clearStaged();
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  const handleDelete = async (photoId: string) => {
    const ok = await confirm({
      title: 'Delete photo?',
      description:
        'The photo is removed from the gallery and its file is deleted.',
      confirmText: 'Delete photo',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deletePhoto({ roomTypeId: roomType.id, photoId }).unwrap();
      toast.success('Photo deleted');
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  const busy = isUploading || processing;

  return (
    <SectionCard
      title="Photos"
      description="The first photo is the cover shown on room cards and lists."
      actions={
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <ImagePlus />
          Add photos
        </Button>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePick}
        disabled={busy}
      />

      {roomType.photos.length === 0 && staged.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No photos yet - the public card shows a placeholder until the
          first upload.
        </p>
      )}

      {roomType.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {roomType.photos.map((photo, index) => (
            <div key={photo.id} className="group relative aspect-[4/3]">
              <Image
                src={photo.url}
                alt={photo.alt ?? roomType.name}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover"
              />
              {index === 0 && (
                <span className="absolute top-1.5 left-1.5 bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-brand-foreground uppercase">
                  Cover
                </span>
              )}
              <Button
                variant="destructive"
                size="icon-sm"
                aria-label="Delete photo"
                className="absolute top-1.5 right-1.5 h-7 w-7 opacity-90"
                onClick={() => handleDelete(photo.id)}
                disabled={isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {staged.length > 0 && (
        <div className="mt-5 border border-dashed border-brand/50 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Staged - nothing is saved until you upload.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {staged.map((photo, index) => (
              <div key={photo.previewUrl} className="relative aspect-[4/3]">
                {/* Object-URL previews can't go through the optimizer. */}
                <Image
                  src={photo.previewUrl}
                  alt={`New photo ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover"
                  unoptimized
                />
                <Button
                  variant="secondary"
                  size="icon-sm"
                  aria-label="Remove staged photo"
                  className="absolute top-1.5 right-1.5 h-7 w-7"
                  onClick={() => removeStaged(index)}
                  disabled={busy}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={handleUpload} disabled={busy}>
              {isUploading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Upload />
              )}
              {isUploading
                ? 'Uploading…'
                : `Upload ${staged.length} photo${staged.length === 1 ? '' : 's'}`}
            </Button>
            <Button variant="outline" onClick={clearStaged} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {confirmDialog}
    </SectionCard>
  );
}
