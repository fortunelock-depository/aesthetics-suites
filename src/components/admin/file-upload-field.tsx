// src/components/admin/file-upload-field.tsx
'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { optimizeImage } from '@/lib/optimize-image';
import { MAX_UPLOAD_BYTES } from '@/lib/uploads-shared';

/**
 * A reusable image-picker field. The chosen file is only STAGED locally
 * (object-URL preview) after client-side downscaling (optimize-image);
 * nothing reaches Cloudinary until the parent form submits it as multipart,
 * so cancelling never orphans an upload. Supports choose / replace / remove,
 * and shows the existing asset when editing.
 */
export function FileUploadField({
  label,
  hint,
  currentUrl,
  onChange,
}: {
  label: string;
  hint?: string;
  /** Existing saved asset URL when editing (null/"" when none). */
  currentUrl?: string | null;
  /** Reports the staged file and whether the saved asset was cleared. */
  onChange: (value: { file: File | null; cleared: boolean }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  // Once the user removes the asset, stop falling back to currentUrl - the
  // preview must reflect the pending "cleared" state, not the saved one.
  const [cleared, setCleared] = useState(false);

  const shownUrl = previewUrl || (file || cleared ? '' : (currentUrl ?? ''));

  const revoke = () => {
    if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  };

  const pick = async (chosen: File | undefined) => {
    if (!chosen) return;
    if (!chosen.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    // Shrink big photos first - the size cap applies to what actually
    // uploads, so a 12MB phone shot that optimizes down to a few hundred
    // KB is fine.
    const staged = await optimizeImage(chosen);
    if (staged.size > MAX_UPLOAD_BYTES) {
      toast.error(
        `Image must be under ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`,
      );
      return;
    }
    revoke();
    setFile(staged);
    setCleared(false);
    setPreviewUrl(URL.createObjectURL(staged));
    if (inputRef.current) inputRef.current.value = '';
    onChange({ cleared: false, file: staged });
  };

  const remove = () => {
    revoke();
    setFile(null);
    setCleared(true);
    setPreviewUrl('');
    if (inputRef.current) inputRef.current.value = '';
    // Cleared: staged file dropped AND any existing saved asset removed.
    onChange({ cleared: true, file: null });
  };

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-4">
        {shownUrl ? (
          <Image
            src={shownUrl}
            alt={label}
            width={120}
            height={120}
            className="h-[104px] w-[104px] flex-none rounded-xl border border-border object-cover"
            unoptimized={shownUrl.startsWith('blob:')}
          />
        ) : (
          <div className="grid h-[104px] w-[104px] flex-none place-items-center rounded-xl border-[1.5px] border-dashed border-border text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              {shownUrl ? 'Replace' : 'Choose image'}
            </Button>
            {shownUrl && (
              <Button
                type="button"
                variant="destructive"
                className="gap-1.5"
                onClick={remove}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
