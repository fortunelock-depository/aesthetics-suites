// src/components/admin/user-menu.tsx
'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, UserCog } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { logout } from '@/lib/auth';
import { routes } from '@/lib/routes';
import { USER_ROLE_LABEL, type UserRoleValue } from '@/types/user.types';

/** "Nana Yaa Asantewaa" -> "NA" (first + last initial). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

/**
 * The console header's account dropdown (dms pattern): initials avatar
 * opening a menu with the signed-in identity, a Profile link, and a
 * confirmed sign-out. The theme toggle deliberately stays OUTSIDE it.
 */
export function UserMenu({
  fullname,
  email,
  role,
}: {
  fullname: string;
  email: string;
  role: UserRoleValue;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
      router.push(routes.login);
      router.refresh();
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="grid h-9 w-9 flex-none place-items-center rounded-full bg-brand font-heading text-sm font-bold text-brand-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {initials(fullname)}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuLabel>
            <span className="block truncate text-sm font-semibold text-foreground">
              {fullname}
            </span>
            <span className="block truncate text-xs font-normal">
              {email}
            </span>
            <span className="mt-0.5 block text-xs font-normal text-brand">
              {USER_ROLE_LABEL[role]}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/admin/profile">
              <UserCog />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Sign out?"
        description="You'll need to sign in again to access the admin console."
        confirmText="Sign out"
        loading={pending}
        onConfirm={handleLogout}
      />
    </>
  );
}
