// src/app/admin/layout.tsx
import type { Metadata } from 'next';
import { requireSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { UserMenu } from '@/components/admin/user-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /login if there is no valid session (the proxy is only the
  // first, cheap gate - this is the authoritative check).
  const { userId, role } = await requireSession();
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { fullname: true, email: true, profilePhoto: true },
  });

  return (
    <SidebarProvider>
      <AdminSidebar role={role} />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger aria-label="Toggle sidebar" />
          <Separator orientation="vertical" className="mr-1 h-5" />
          <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">
            Console
          </span>
          <span className="flex-1" />
          <ThemeToggle className="h-8 w-8 border border-border text-foreground hover:bg-muted" />
          <UserMenu
            fullname={user?.fullname ?? 'Account'}
            email={user?.email ?? ''}
            role={role}
            photoUrl={user?.profilePhoto ?? null}
          />
        </header>

        <main className="@container/main flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
