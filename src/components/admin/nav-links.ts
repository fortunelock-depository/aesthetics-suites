// src/components/admin/nav-links.ts
import {
  BedDouble,
  BellRing,
  CalendarCheck,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  Star,
  TicketPercent,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { UserRoleValue } from '@/types/user.types';

export interface AdminLink {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roles that see this entry. */
  roles: UserRoleValue[];
}

const ALL: UserRoleValue[] = ['SUPER_ADMIN', 'ADMIN', 'FRONT_DESK'];
const ADMINS: UserRoleValue[] = ['SUPER_ADMIN', 'ADMIN'];

/**
 * Sidebar navigation, ordered by day-to-day centrality (the dms
 * convention): overview, then the operational core (bookings, rooms),
 * then content (facilities, services, reviews), then pricing, and the
 * system tools last.
 */
export const adminLinks: AdminLink[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, roles: ALL },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck, roles: ALL },
  { href: '/admin/rooms', label: 'Rooms', icon: BedDouble, roles: ADMINS },
  { href: '/admin/facilities', label: 'Facilities', icon: Landmark, roles: ADMINS },
  { href: '/admin/services', label: 'Services', icon: BellRing, roles: ADMINS },
  { href: '/admin/reviews', label: 'Reviews', icon: Star, roles: ADMINS },
  { href: '/admin/discounts', label: 'Discounts', icon: TicketPercent, roles: ADMINS },
  { href: '/admin/tax-fees', label: 'Tax & Fees', icon: ReceiptText, roles: ADMINS },
  { href: '/admin/users', label: 'Users', icon: Users, roles: ['SUPER_ADMIN'] },
  { href: '/admin/security', label: 'Security', icon: ShieldCheck, roles: ALL },
];

/** True when `pathname` is the active route for `href`. */
export function isActiveLink(href: string, pathname: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}
