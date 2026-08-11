// src/components/rooms/rooms-sidebar.tsx
import type { IPublicRoomCard } from '@/lib/hotel/public-rooms';
import { CategoryList } from './category-list';
import { SidebarBookingCard } from './sidebar-booking-card';
import { MobileSidebarDrawers } from './mobile-sidebar-drawers';

/** The template's sidebar widget shell (white bordered card, underlined title). */
export function SidebarWidget({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-card p-7">
      <h2 className="font-heading text-[22px] font-medium text-foreground">
        {title}
      </h2>
      <span aria-hidden className="mt-2 block h-0.5 w-10 bg-brand" />
      <div className="mt-5">{children}</div>
    </div>
  );
}

/**
 * Category + Booking Now (shared by the room list and room detail
 * sidebars). Desktop: the template's inline widget cards. Phones: two
 * side-by-side buttons lifting each card up as a bottom drawer, so the
 * widgets never stretch the page.
 */
export function RoomsSidebarWidgets({ rooms }: { rooms: IPublicRoomCard[] }) {
  return (
    <>
      <MobileSidebarDrawers rooms={rooms} />

      <div className="hidden space-y-8 lg:block">
        <SidebarWidget title="Category">
          <CategoryList rooms={rooms} />
        </SidebarWidget>

        <SidebarWidget title="Booking Now">
          <SidebarBookingCard />
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
