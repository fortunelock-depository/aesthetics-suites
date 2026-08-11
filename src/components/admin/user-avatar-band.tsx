// src/components/admin/user-avatar-band.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ROLE_TONE } from '@/components/admin/users/columns';
import { initials } from '@/lib/initials';
import { cn } from '@/lib/utils';
import { USER_ROLE_LABEL, type UserRoleValue } from '@/types/user.types';

/**
 * Display-only version of the profile page's avatar band, for viewing
 * OTHER users: photo (click to zoom) or initials, name, role badge and a
 * subtitle line. Upload controls deliberately absent - a photo is
 * personal, only its owner manages it from their own profile.
 */
export function UserAvatarBand({
  fullname,
  role,
  photoUrl,
  subtitle,
}: {
  fullname: string;
  role: UserRoleValue;
  photoUrl: string | null;
  subtitle?: string;
}) {
  const [viewerOpen, setViewerOpen] = React.useState(false);

  return (
    <div className="flex flex-col items-center gap-6 bg-muted p-5 sm:flex-row">
      <button
        type="button"
        aria-label={photoUrl ? 'View photo full size' : 'No profile photo'}
        onClick={photoUrl ? () => setViewerOpen(true) : undefined}
        className={cn(
          'group relative grid h-24 w-24 flex-none place-items-center overflow-hidden rounded-full ring-4 ring-brand/20',
          photoUrl ? 'cursor-pointer' : 'cursor-default bg-brand',
        )}
      >
        {photoUrl ? (
          <>
            <Image
              src={photoUrl}
              alt={fullname}
              fill
              sizes="96px"
              className="object-cover"
            />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn className="h-7 w-7 text-white" />
            </span>
          </>
        ) : (
          <span className="font-heading text-2xl font-bold text-brand-foreground">
            {initials(fullname)}
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <div className="mb-1 flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
          <p className="min-w-0 text-base font-medium text-foreground [overflow-wrap:anywhere]">
            {fullname}
          </p>
          <StatusBadge tone={ROLE_TONE[role]}>
            {USER_ROLE_LABEL[role]}
          </StatusBadge>
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {subtitle}
          </p>
        )}
      </div>

      <DialogPrimitive.Root open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70" />
          <DialogPrimitive.Content
            className="fixed top-1/2 left-1/2 z-50 w-[min(90vw,32rem)] -translate-x-1/2 -translate-y-1/2 border border-border bg-card p-4 outline-none"
            aria-describedby={undefined}
          >
            <div className="flex items-center justify-between gap-2">
              <DialogPrimitive.Title className="min-w-0 truncate font-semibold">
                {fullname}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close viewer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>
            <div className="relative mt-3 aspect-square w-full bg-muted">
              {photoUrl && (
                <Image
                  src={photoUrl}
                  alt={fullname}
                  fill
                  sizes="(max-width: 640px) 90vw, 512px"
                  className="object-cover"
                />
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
