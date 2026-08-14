// src/components/site/social-circles.tsx
import { Facebook, Instagram, Youtube } from 'lucide-react';
import type { SVGProps } from 'react';
import { ArcRing } from './arc-ring';

/**
 * Brand marks lucide dropped (or never had), drawn the same way the
 * website-frontend / dms-frontend footers do it: a single currentColor
 * path in a 24×24 viewBox, so they slot in beside the lucide icons.
 */
const XIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TikTokIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const SnapchatIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.323 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.61.61 0 0 1 .293-.07c.116 0 .234.021.348.06.293.09.585.315.6.63.016.375-.27.72-.855.96-.075.03-.165.06-.27.09-.36.12-.9.285-1.05.675-.075.195-.045.45.104.75l.016.015c.045.105 1.245 2.655 3.855 3.09.24.03.42.24.405.48 0 .075-.015.15-.045.225-.24.57-1.005.975-2.325 1.2-.045.06-.075.24-.105.405-.015.12-.045.24-.075.375-.045.195-.18.435-.524.435h-.03c-.135 0-.313-.031-.538-.076-.36-.06-.764-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 2.595-.42 3.78-2.958 3.855-3.09l.015-.03c.135-.27.18-.51.105-.689-.15-.389-.674-.61-1.05-.679-.089-.03-.179-.045-.254-.09-.777-.3-.868-.615-.86-.883.015-.465.585-.766.998-.766.15 0 .27.03.36.09.42.194.789.3 1.104.3.234 0 .384-.06.45-.105l-.047-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06Z" />
  </svg>
);

/** Social presences: deliberately unlinked until the real profiles exist. */
const SOCIALS = [
  { icon: Facebook, label: 'Facebook' },
  { icon: Instagram, label: 'Instagram' },
  { icon: XIcon, label: 'X' },
  { icon: SnapchatIcon, label: 'Snapchat' },
  { icon: TikTokIcon, label: 'TikTok' },
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
