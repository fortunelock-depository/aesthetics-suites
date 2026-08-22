// src/components/admin/user-menu.tsx
'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, UserCog } from 'lucide-react';
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
import { initials } from '@/lib/initials';
import { USER_ROLE_LABEL, type UserRoleValue } from '@/types/user.types';

/**
 * The console header's account dropdown: avatar (photo, or initials)
 * opening a menu with the signed-in identity, Profile and Settings links,
 * and a confirmed sign-out. The theme toggle deliberately
 * stays OUTSIDE it.
 */
export function UserMenu({
  fullname,
  email,
  role,
  photoUrl,
}: {
  fullname: string;
  email: string;
  role: UserRoleValue;
  photoUrl: string | null;
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
            className="relative grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-full bg-brand font-heading text-sm font-bold text-brand-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={fullname}
                fill
                sizes="36px"
                className="object-cover"
              />
            ) : (
              initials(fullname)
            )}
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
            <span className="mt-0.5 block text-xs font-normal text-brand-text">
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
          <DropdownMenuItem asChild>
            <Link href="/admin/profile?tab=security">
              <Settings />
              Settings
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
