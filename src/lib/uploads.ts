// src/lib/uploads.ts
//
// Shared upload handling: one place that turns a multipart File into the
// buffer the Cloudinary layer accepts, enforcing size and type limits.
// Cloudinary would reject non-images eventually, but by then the bytes have
// already been buffered into memory - so limits are enforced up front.
import 'server-only';
import { ValidationError } from '@/middlewares/error-handler';
import type { IUploadedFile } from '@/types/cloudinary.types';
import { MAX_UPLOAD_BYTES } from '@/lib/uploads-shared';

export { MAX_UPLOAD_BYTES } from '@/lib/uploads-shared';

/** SVG is deliberately excluded - it can carry scripts (stored XSS). */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;

const prettyMax = `${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`;

/**
 * Validates an image's size and MIME type before any buffering/upload.
 * `label` names the field in error messages ("cover image", "room photo").
 */
export function assertValidImage(
  { size, mimetype }: { size: number; mimetype: string },
  label = 'image',
): void {
  if (size > MAX_UPLOAD_BYTES) {
    throw new ValidationError(`The ${label} is too large (max ${prettyMax}).`);
  }
  if (
    !(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(
      mimetype.toLowerCase(),
    )
  ) {
    throw new ValidationError(
      `The ${label} must be a JPEG, PNG, WebP, AVIF, or GIF.`,
    );
  }
}

/**
 * Converts an uploaded form File into a buffer the Cloudinary layer accepts,
 * enforcing the size/type limits first. Returns undefined for absent/empty
 * entries so optional image fields stay optional.
 */
export async function fileToUploaded(
  value: FormDataEntryValue | null,
  label = 'image',
): Promise<IUploadedFile | undefined> {
  if (!value || typeof value === 'string') return undefined;
  if (value.size === 0) return undefined;

  assertValidImage({ size: value.size, mimetype: value.type }, label);

  const buffer = Buffer.from(await value.arrayBuffer());
  return { buffer, originalname: value.name, mimetype: value.type };
}
