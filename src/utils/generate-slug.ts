// src/utils/generate-slug.ts

/** URL slug from a name: "Deluxe Suite & Spa" -> "deluxe-suite-spa". */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}
