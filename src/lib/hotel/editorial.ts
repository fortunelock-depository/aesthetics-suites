// src/lib/hotel/editorial.ts
//
// Shared shapes for editorial content (facilities, services): both render
// through the same InterlockingRows and EditorialDetail components.

/** What a row in the interlocking list needs. */
export interface IEditorialRow {
  id: string;
  slug: string;
  eyebrow: string;
  name: string;
  summary: string;
  photos: { url: string; alt: string | null }[];
}

/** What the detail page body needs (rows plus the long-form fields). */
export interface IEditorialDetail extends IEditorialRow {
  description: string[];
  highlights: string[];
}
