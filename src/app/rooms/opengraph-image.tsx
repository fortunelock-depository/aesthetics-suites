import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-image';

export const alt = 'Our Rooms - Aesthetics Suites';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return brandOgImage({
    eyebrow: 'Rooms',
    title: 'Our Luxury Rooms',
    subtitle: 'Nightly rates, capacity, and every comfort - pick your suite.',
    cta: 'Browse the rooms →',
  });
}
