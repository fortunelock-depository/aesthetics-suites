import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-image';

export const alt = 'Contact Us - Aesthetics Suites';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return brandOgImage({
    eyebrow: 'Contact',
    title: 'Get In Touch',
    subtitle: 'Questions about stays, bookings, or the suites - we reply fast.',
    cta: 'Send a message →',
  });
}
