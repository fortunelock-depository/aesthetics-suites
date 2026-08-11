// Default OG card - applies to every route without a more specific one.
import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-image';
import { SITE } from '@/config/constants';

export const alt = SITE.title;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return brandOgImage({
    eyebrow: 'Aesthetics Suites',
    title: 'Luxury Styled to Perfection',
    subtitle: SITE.description,
  });
}
