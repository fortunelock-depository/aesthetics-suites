// src/components/contact/contact-info.tsx
import { Mail, MapPin, Phone, type LucideIcon } from 'lucide-react';
import { SocialCircles } from '@/components/site/social-circles';
import { EYEBROW } from '@/components/site/section-heading';
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
    label: 'Reception',
    value: CONTACT.phone,
    href: `tel:${CONTACT.phone}`,
  },
  {
    icon: Mail,
    label: 'Email',
    value: CONTACT.email,
    href: `mailto:${CONTACT.email}`,
  },
  { icon: MapPin, label: 'Find us', value: CONTACT.location },
];

/**
 * The contact column: how to reach the property, each line under a small
 * muted label, then the social circles.
 */
export function ContactInfo() {
  return (
    <div>
      <p className={EYEBROW}>Contact</p>
      <h2 className="mt-4 font-heading text-[32px] leading-[1.15] font-light tracking-[-0.01em] text-foreground lg:text-[45px]">
        Reach us
      </h2>
      <p className="mt-4 max-w-md text-[15px] leading-[26px] text-muted-foreground">
        Questions about a stay, a booking, or the suites themselves - call the
        front desk or send a message and the team will come back to you
        shortly.
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
                  className="mt-1 block text-[17px] font-medium text-foreground transition-colors [overflow-wrap:anywhere] hover:text-brand-text"
                >
                  {value}
                </a>
              ) : (
                <p className="mt-1 text-[17px] font-medium text-foreground [overflow-wrap:anywhere]">
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
