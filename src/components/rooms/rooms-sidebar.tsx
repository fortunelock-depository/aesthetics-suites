// src/components/rooms/rooms-sidebar.tsx
import type { IPublicRoomCard } from '@/lib/hotel/public-rooms';
import { CategoryList } from './category-list';
import { SidebarBookingCard } from './sidebar-booking-card';
import { MobileSidebarDrawers } from './mobile-sidebar-drawers';

/** Sidebar widget shell: bordered card with an underlined title. */
export function SidebarWidget({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-card p-7">
      <h2 className="font-heading text-[22px] font-normal tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      <span aria-hidden className="mt-2 block h-0.5 w-10 bg-brand" />
      <div className="mt-5">{children}</div>
    </div>
  );
}

/**
 * The suite list + availability form (shared by the room list and room
 * detail sidebars). Desktop: inline widget cards. Phones: two side-by-side
 * buttons lifting each card up as a bottom drawer, so the widgets never
 * stretch the page.
 */
export function RoomsSidebarWidgets({
  rooms,
  bookPath,
}: {
  /** May be empty (a detail page for the only published suite). */
  rooms: IPublicRoomCard[];
  /** Set on the room detail page: its own /book route, so the widget goes
   * straight to checkout with the chosen dates. */
  bookPath?: string;
}) {
  // On a room's own page the list is everything BUT the room being read;
  // on the room list it is simply the suites.
  const suitesTitle = bookPath ? 'Other suites' : 'Suites';

  return (
    <>
      <MobileSidebarDrawers
        rooms={rooms}
        bookPath={bookPath}
        suitesTitle={suitesTitle}
      />

      <div className="hidden space-y-8 lg:block">
        {rooms.length > 0 && (
          <SidebarWidget title={suitesTitle}>
            <CategoryList rooms={rooms} />
          </SidebarWidget>
        )}

        <SidebarWidget title="Check availability">
          <SidebarBookingCard bookPath={bookPath} />
        </SidebarWidget>
      </div>
    </>
  );
}

/** The room-list page's full sidebar. */
export function RoomsSidebar({ rooms }: { rooms: IPublicRoomCard[] }) {
  return (
    <aside className="space-y-8 lg:sticky lg:top-[137px] lg:self-start">
      <RoomsSidebarWidgets rooms={rooms} />
    </aside>
  );
}
