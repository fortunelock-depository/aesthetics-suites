// src/components/contact/contact-info.tsx
import { Mail, MapPin, Phone, type LucideIcon } from 'lucide-react';
import { SocialCircles } from '@/components/site/social-circles';
import { CONTACT } from '@/config/constants';

interface InfoRow {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
}

const ROWS: InfoRow[] = [
  {
    icon: Phone,
    label: 'Emergency Help',
    value: CONTACT.phone,
    href: `tel:${CONTACT.phone}`,
  },
  {
    icon: Mail,
    label: 'Quick Email',
    value: CONTACT.email,
    href: `mailto:${CONTACT.email}`,
  },
  { icon: MapPin, label: 'Office Address', value: CONTACT.location },
];

/**
 * The "Get In Touch" column: gold outline icon, small muted label on top,
 * bold value below - stacked rows, then the social circles.
 */
export function ContactInfo() {
  return (
    <div>
      <h2 className="font-heading text-[32px] leading-[1.3] font-medium text-foreground lg:text-[45px] lg:leading-[60px]">
        Get In Touch
      </h2>
      <p className="mt-4 max-w-md text-[15px] leading-[26px] text-muted-foreground">
        Questions about a stay, a booking, or the suites themselves - send a
        message and the team will get back to you shortly.
      </p>

      <ul className="mt-8 space-y-6">
        {ROWS.map(({ icon: Icon, label, value, href }) => (
          <li key={label} className="flex items-start gap-5">
            <span className="grid h-12 w-12 flex-none place-items-center text-brand">
              <Icon className="h-8 w-8" strokeWidth={1.25} />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{label}</p>
              {href ? (
                <a
                  href={href}
                  className="mt-0.5 block font-heading text-lg font-medium text-foreground transition-colors [overflow-wrap:anywhere] hover:text-brand-text"
                >
                  {value}
                </a>
              ) : (
                <p className="mt-0.5 font-heading text-lg font-medium text-foreground [overflow-wrap:anywhere]">
                  {value}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <SocialCircles className="mt-8 flex items-center gap-3" />
    </div>
  );
}
