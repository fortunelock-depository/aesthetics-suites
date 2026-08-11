// src/components/admin/logout-button.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';
import { routes } from '@/lib/routes';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
      router.push(routes.login);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 md:px-4 md:py-2"
      >
        <LogOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">
          {pending ? 'Signing out…' : 'Sign out'}
        </span>
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Sign out?"
        description="You'll need to sign in again to access the admin console."
        confirmText="Sign out"
        loading={pending}
        onConfirm={handleLogout}
      />
    </>
  );
}
