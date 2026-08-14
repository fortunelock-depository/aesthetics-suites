// src/components/rooms/mobile-sidebar-drawers.tsx
'use client';

import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { CalendarCheck, LayoutList, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IPublicRoomCard } from '@/lib/hotel/public-rooms';
import { CategoryList } from './category-list';
import { SidebarBookingCard } from './sidebar-booking-card';

type DrawerKind = 'categories' | 'booking' | null;

/**
 * The phone replacement for the sidebar cards: two side-by-side buttons
 * (Categories / Booking Now) that lift the corresponding card up as a
 * bottom drawer - so the widgets never stretch the page on small screens.
 * Desktop keeps the inline sidebar; this whole component is lg:hidden.
 */
export function MobileSidebarDrawers({
  rooms,
  bookPath,
}: {
  rooms: IPublicRoomCard[];
  bookPath?: string;
}) {
  const [open, setOpen] = useState<DrawerKind>(null);

  const title = open === 'categories' ? 'Category' : 'Booking Now';

  return (
    <div className="lg:hidden">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setOpen('categories')}
          className="inline-flex items-center justify-center gap-2 border border-border bg-card px-4 py-3.5 font-heading text-sm font-semibold text-foreground uppercase transition-colors hover:border-brand hover:text-brand"
        >
          <LayoutList className="h-4 w-4 text-brand" />
          Categories
        </button>
        <button
          type="button"
          onClick={() => setOpen('booking')}
          className="inline-flex items-center justify-center gap-2 bg-brand px-4 py-3.5 font-heading text-sm font-bold text-brand-foreground uppercase transition-opacity hover:opacity-90"
        >
          <CalendarCheck className="h-4 w-4" />
          Booking Now
        </button>
      </div>

      <Dialog.Root
        open={open !== null}
        onOpenChange={(next) => !next && setOpen(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto border-t border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-10 data-[state=closed]:fade-out-0"
          >
            <div className="mb-1 flex items-center justify-between gap-3">
              <Dialog.Title className="font-heading text-[22px] font-medium text-foreground">
                {title}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            <span aria-hidden className="block h-0.5 w-10 bg-brand" />

            <div className="mt-4">
              {open === 'categories' ? (
                <CategoryList rooms={rooms} onNavigate={() => setOpen(null)} />
              ) : (
                <SidebarBookingCard bookPath={bookPath} onDone={() => setOpen(null)} />
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
