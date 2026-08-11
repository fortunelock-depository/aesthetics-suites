// src/components/site/social-circles.tsx
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { ArcRing } from './arc-ring';

/** Social presences: deliberately unlinked until the real profiles exist. */
const SOCIALS = [
  { icon: Facebook, label: 'Facebook' },
  { icon: Instagram, label: 'Instagram' },
  { icon: Twitter, label: 'X (Twitter)' },
  { icon: Youtube, label: 'YouTube' },
];

/**
 * The circle social icons (footer + contact page): each carries the
 * tapered gold arc that runs one full lap on hover (.social-ring CSS).
 * They become links when the profiles go live.
 */
export function SocialCircles({ className }: { className?: string }) {
  return (
    <ul aria-label="Social media" className={className ?? 'flex items-center gap-3'}>
      {SOCIALS.map(({ icon: Icon, label }) => (
        <li key={label}>
          <span
            title={label}
            className="social-ring grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-brand"
          >
            <ArcRing color="#DCA278" strokeWidth={3} className="social-arc" />
            <Icon className="h-4 w-4" aria-hidden />
            <span className="sr-only">{label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
