// src/components/rooms/category-list.tsx
import Link from 'next/link';
import { ChevronsRight } from 'lucide-react';
import type { IPublicRoomCard } from '@/lib/hotel/public-rooms';
import { roomDetail } from '@/lib/routes';

/**
 * The Category widget's row list: chevron, name, dashed dividers,
 * zero-padded unit count. Shared by the desktop sidebar card
 * and the mobile bottom drawer (`onNavigate` closes the drawer on tap).
 */
export function CategoryList({
  rooms,
  onNavigate,
}: {
  rooms: IPublicRoomCard[];
  onNavigate?: () => void;
}) {
  return (
    <ul>
      {rooms.map((room) => (
        <li
          key={room.id}
          className="border-b border-dashed border-border last:border-0"
        >
          <Link
            href={roomDetail(room.slug)}
            onClick={onNavigate}
            className="group flex items-baseline gap-2 py-3 text-[15px] text-foreground transition-colors hover:text-brand-text"
          >
            <ChevronsRight className="h-4 w-4 flex-none self-center text-brand transition-transform group-hover:translate-x-0.5" />
            <span className="min-w-0 truncate" title={room.name}>
              {room.name}
            </span>
            <span className="min-w-2 flex-1" aria-hidden />
            <span className="flex-none text-muted-foreground">
              ({String(room.unitCount).padStart(2, '0')})
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
