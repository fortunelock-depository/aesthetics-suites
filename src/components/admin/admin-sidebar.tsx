// src/components/admin/admin-sidebar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { adminLinks, isActiveLink } from './nav-links';
import { SITE } from '@/config/constants';
import { routes } from '@/lib/routes';
import type { UserRoleValue } from '@/types/user.types';

/**
 * The console's sidebar (dms pattern on the shadcn sidebar primitive):
 * brand header, role-filtered nav with active highlighting, and a footer
 * link back to the public site. Collapses to icons on desktop via the
 * rail; becomes an off-canvas sheet on mobile.
 */
export function AdminSidebar({ role }: { role: UserRoleValue }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const links = adminLinks.filter((link) => link.roles.includes(role));

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href={routes.admin}
          onClick={closeOnMobile}
          className="flex min-w-0 items-center gap-2.5 px-1.5 py-2"
        >
          <Image
            src="/logo-mark-dark.png"
            alt=""
            width={30}
            height={28}
            className="h-7 w-auto flex-none dark:hidden"
          />
          <Image
            src="/logo-mark.png"
            alt=""
            width={30}
            height={28}
            className="hidden h-7 w-auto flex-none dark:block"
          />
          <span className="min-w-0 truncate font-heading text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            {SITE.name}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="px-2">
          {links.map((link) => {
            const active = isActiveLink(link.href, pathname);
            const Icon = link.icon;
            return (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={link.label}
                >
                  <Link href={link.href} onClick={closeOnMobile}>
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="View site">
              <Link href={routes.home} target="_blank" rel="noopener">
                <ExternalLink className="h-4 w-4" />
                <span>View site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
