// src/components/rooms/stay-link.tsx
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CtaLink } from '@/components/site/cta-link';

/** The stay params the booking funnel hands from page to page. */
const STAY_PARAM_KEYS = ['checkIn', 'checkOut', 'adults', 'children'] as const;

/** Serializes the current URL's stay params (only) into a query suffix. */
export function stayQuerySuffix(params: URLSearchParams): string {
  const carried = new URLSearchParams();
  for (const key of STAY_PARAM_KEYS) {
    const value = params.get(key);
    if (value) carried.set(key, value);
  }
  const s = carried.toString();
  return s ? `?${s}` : '';
}

interface StayLinkProps extends Omit<React.ComponentProps<typeof Link>, 'href'> {
  href: string;
  children: React.ReactNode;
}

function StayLinkInner({ href, children, ...rest }: StayLinkProps) {
  const params = useSearchParams();
  return (
    <Link href={`${href}${stayQuerySuffix(params)}`} {...rest}>
      {children}
    </Link>
  );
}

/**
 * A Link that carries the guest's chosen stay (checkIn/checkOut/guests)
 * from the hero bar through the room list and detail pages into the
 * checkout - so dates typed once are never typed again. Pages stay
 * statically cached: the params ride the URL and are read CLIENT-side
 * (the Suspense fallback renders the plain link during static render).
 */
export function StayLink(props: StayLinkProps) {
  return (
    <Suspense fallback={<Link {...props}>{props.children}</Link>}>
      <StayLinkInner {...props} />
    </Suspense>
  );
}

interface StayCtaLinkProps
  extends Omit<React.ComponentProps<typeof CtaLink>, 'href'> {
  href: string;
  children: React.ReactNode;
}

function StayCtaLinkInner({ href, children, ...rest }: StayCtaLinkProps) {
  const params = useSearchParams();
  return (
    <CtaLink href={`${href}${stayQuerySuffix(params)}`} {...rest}>
      {children}
    </CtaLink>
  );
}

/** CtaLink flavor of StayLink - the detail page's gold Book Now. */
export function StayCtaLink(props: StayCtaLinkProps) {
  return (
    <Suspense
      fallback={
        <CtaLink {...props} href={props.href}>
          {props.children}
        </CtaLink>
      }
    >
      <StayCtaLinkInner {...props} />
    </Suspense>
  );
}
