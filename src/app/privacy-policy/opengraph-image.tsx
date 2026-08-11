import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-image';

export const alt = 'Privacy Policy - Aesthetics Suites';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return brandOgImage({
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    subtitle: 'How we collect, use, and protect your information.',
    cta: 'Read the policy →',
  });
}
