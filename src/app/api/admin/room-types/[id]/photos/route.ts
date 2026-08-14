// src/app/api/admin/room-types/[id]/photos/route.ts
//
// Adds gallery photos (multipart form, field `photos`, one or many files).
// The client stages files through FileUploadField (already downscaled);
// the factory is the authoritative size/type gate before Cloudinary.
import { roomTypePhotoHandlers } from './handlers';

export const POST = roomTypePhotoHandlers.POST;
