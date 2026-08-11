// src/lib/seo.ts
import type { Metadata } from 'next';
import { SITE } from '@/config/constants';

/** Clamps text at a word boundary, appending an ellipsis when cut. */
export function clampDescription(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max - 1).trimEnd()}…`;
}

/** Google truncates search snippets around 150-160 characters. */
const META_DESCRIPTION_MAX = 155;
/** Social previews show ~125 characters and truncate on mobile. */
const SOCIAL_DESCRIPTION_MAX = 125;

interface PageMetaOptions {
  title: string;
  description: string;
  /** Path after the origin, e.g. "/login". Defaults to the home page. */
  path?: string;
  /** Use the title verbatim (no "| Aesthetics Suites" suffix). */
  absoluteTitle?: boolean;
  /** Set false for transactional/no-value pages (kept out of search). */
  index?: boolean;
}

/**
 * Builds consistent per-page metadata (canonical URL + Open Graph + Twitter).
 * Descriptions are clamped: ~155 chars for the meta description (Google),
 * ~125 for OG/Twitter (social previews). OG/Twitter images come from the
 * opengraph-image.tsx file conventions (src/app/**), which take priority over
 * config metadata and are generated at build time from src/lib/og-image.tsx.
 */
export function pageMetadata({
  title,
  description,
  path = '',
  absoluteTitle = false,
  index = true,
}: PageMetaOptions): Metadata {
  const url = `${SITE.url}${path}`;
  const ogTitle = absoluteTitle ? title : `${title} - ${SITE.name}`;
  const metaDescription = clampDescription(description, META_DESCRIPTION_MAX);
  const socialDescription = clampDescription(
    description,
    SOCIAL_DESCRIPTION_MAX,
  );

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: metaDescription,
    alternates: { canonical: url },
    robots: index ? undefined : { index: false, follow: true },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      title: ogTitle,
      description: socialDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: socialDescription,
    },
  };
}
