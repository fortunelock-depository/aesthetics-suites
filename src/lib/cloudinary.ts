// src/lib/cloudinary.ts
import 'server-only';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { ENV } from '@/config/env';
import logger from '@/utils/logger';
import { CustomError } from '@/middlewares/error-handler';
import type {
  IUploadedFile,
  ICloudinaryUploadResult,
} from '@/types/cloudinary.types';

let configured = false;

/** Configures Cloudinary once, on first use. Throws if creds are missing. */
function ensureConfigured(): void {
  if (configured) return;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    ENV;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new CustomError(
      500,
      'Image uploads are not configured (missing Cloudinary credentials).',
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  configured = true;
}

/** Extracts the Cloudinary public_id (incl. folder) from a delivery URL. */
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split('/');
    const deliveryIndex = parts.findIndex(
      (p) => p === 'upload' || p === 'authenticated',
    );
    if (deliveryIndex === -1) return null;

    let startIndex = deliveryIndex + 1;
    if (parts[startIndex] && /^v\d+$/.test(parts[startIndex])) startIndex++;

    const publicIdParts = parts.slice(startIndex);
    if (publicIdParts.length === 0) return null;

    const last = publicIdParts[publicIdParts.length - 1];
    publicIdParts[publicIdParts.length - 1] = last.split('.')[0];
    return publicIdParts.join('/');
  } catch {
    return null;
  }
}

/** Uploads a buffer (or remote/data URL) to Cloudinary and returns the result. */
export async function uploadImage(
  file: IUploadedFile | string,
  opts: { folder?: string } = {},
): Promise<ICloudinaryUploadResult> {
  ensureConfigured();

  const options = {
    resource_type: 'image' as const,
    folder: opts.folder ?? ENV.CLOUDINARY_FOLDER,
  };

  const result: UploadApiResponse =
    typeof file === 'string'
      ? await cloudinary.uploader.upload(file, options)
      : await new Promise<UploadApiResponse>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            options,
            (error, uploadResult) => {
              if (error || !uploadResult) {
                reject(error ?? new Error('Upload failed'));
              } else {
                resolve(uploadResult);
              }
            },
          );
          stream.end(file.buffer);
        });

  return {
    public_id: result.public_id,
    secure_url: result.secure_url,
    format: result.format,
    resource_type: result.resource_type,
  };
}

/**
 * Deletes an image by URL or public_id. Best-effort: logs and swallows errors
 * so cleanup never blocks the main operation.
 */
export async function deleteImage(urlOrPublicId: string): Promise<void> {
  try {
    ensureConfigured();
    const publicId = urlOrPublicId.includes('http')
      ? extractPublicIdFromUrl(urlOrPublicId)
      : urlOrPublicId;
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    logger.error({ error, urlOrPublicId }, 'Failed to delete Cloudinary image');
  }
}
