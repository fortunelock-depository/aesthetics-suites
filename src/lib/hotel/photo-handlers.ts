// src/lib/hotel/photo-handlers.ts
//
// Factory for the three identical photo route pairs (room types,
// facilities, services). They differ only in Prisma model, Cloudinary
// folder, and which public surface to revalidate - everything else
// (multipart parsing, size/type gate, sort-order append, cleanup) is one
// implementation. This exists because the hand-cloned copies drifted in
// production once (the services clone revalidated the facilities pages).
import 'server-only';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { fileToUploaded } from '@/lib/uploads';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import { NotFoundError, ValidationError } from '@/lib/errors';

/** Photos accepted per request - each is buffered in memory before
 * Cloudinary, so an unbounded batch is an easy OOM. */
const MAX_PHOTOS_PER_REQUEST = 12;

export interface PhotoHandlerConfig {
  /** "Room type" / "Facility" / "Service" - not-found copy. */
  entityLabel: string;
  /**
   * What one upload is called in validation copy ("room photo"), which is
   * not always the entity label lowercased - "room type photo" reads wrong
   * to a guest-facing admin.
   */
  photoLabel: string;
  /** Cloudinary folder for uploads. */
  folder: string;
  /** Loads the parent row (null when absent); slug feeds revalidation. */
  findParent: (id: string) => Promise<{ id: string; slug: string } | null>;
  /** Highest existing sortOrder for the parent (null when no photos). */
  lastSortOrder: (parentId: string) => Promise<number | null>;
  createPhoto: (input: {
    parentId: string;
    url: string;
    publicId: string;
    alt?: string;
    sortOrder: number;
  }) => Promise<unknown>;
  /** Loads a photo scoped to its parent (null when absent). */
  findPhoto: (
    parentId: string,
    photoId: string,
  ) => Promise<{ publicId: string | null; url: string; parentSlug: string } | null>;
  deletePhoto: (photoId: string) => Promise<unknown>;
  revalidate: (slug: string) => void;
}

/**
 * Builds the POST (upload one-or-many) and DELETE (single photo) handlers
 * a photo route file re-exports.
 */
export function makePhotoHandlers(config: PhotoHandlerConfig) {
  async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
  ) {
    try {
      await requireAdmin();
      const { id } = await params;

      const parent = await config.findParent(id);
      if (!parent) throw new NotFoundError(`${config.entityLabel} not found`);

      const form = await req.formData();
      const files = form.getAll('photos');
      if (files.length === 0) {
        throw new ValidationError('Attach at least one photo.');
      }
      if (files.length > MAX_PHOTOS_PER_REQUEST) {
        throw new ValidationError(
          `Upload at most ${MAX_PHOTOS_PER_REQUEST} photos per request.`,
        );
      }

      const alt = form.get('alt');
      let sortOrder = ((await config.lastSortOrder(parent.id)) ?? -1) + 1;

      // Uploads land in Cloudinary before their row exists, so a failure
      // part-way through a batch would strand the assets uploaded so far.
      // Track them and clean up on the way out.
      const uploadedPublicIds: string[] = [];
      const created = [];
      try {
        for (const file of files) {
          const uploaded = await fileToUploaded(file, config.photoLabel);
          if (!uploaded) continue;
          const result = await uploadImage(uploaded, { folder: config.folder });
          uploadedPublicIds.push(result.public_id);
          created.push(
            await config.createPhoto({
              parentId: parent.id,
              url: result.secure_url,
              publicId: result.public_id,
              alt: typeof alt === 'string' && alt ? alt : undefined,
              sortOrder: sortOrder++,
            }),
          );
        }
      } catch (err) {
        // Best effort: never let cleanup mask what actually went wrong.
        await Promise.allSettled(
          uploadedPublicIds.map((publicId) => deleteImage(publicId)),
        );
        throw err;
      }

      config.revalidate(parent.slug);
      return successResponse(created, 'Photos uploaded', 201);
    } catch (err) {
      return handleApiError(err);
    }
  }

  async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string; photoId: string }> },
  ) {
    try {
      await requireAdmin();
      const { id, photoId } = await params;

      const photo = await config.findPhoto(id, photoId);
      if (!photo) throw new NotFoundError('Photo not found');

      await config.deletePhoto(photoId);
      // Best-effort Cloudinary cleanup (never blocks the delete).
      await deleteImage(photo.publicId ?? photo.url);

      config.revalidate(photo.parentSlug);
      return successResponse({ id: photoId }, 'Photo deleted');
    } catch (err) {
      return handleApiError(err);
    }
  }

  return { POST, DELETE };
}
