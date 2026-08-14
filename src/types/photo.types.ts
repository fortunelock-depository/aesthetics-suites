// src/types/photo.types.ts

/**
 * A saved gallery photo as every photo-bearing entity (rooms, facilities,
 * services) serializes it. Lives in types/ (the bottom layer) - DTO
 * definitions must never depend on the component tree.
 */
export interface ManagedPhoto {
  id: string;
  url: string;
  alt: string | null;
}
