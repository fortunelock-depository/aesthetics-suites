// src/lib/hotel/units.ts
//
// Which physical units a listing (RoomType) can sell. A unit is sellable
// under the listing that OWNS it (Room.roomTypeId) and under every listing
// it is SHARED into (RoomTypeSharedUnit) - the derived-room-type pattern
// that lets one two-bedroom apartment be sold whole or as a single bedroom.
// Every query that means "the units of this room type" must go through
// this predicate, so shared inventory is never silently ignored.
import type { Prisma } from '@/lib/prisma';

/** Prisma `where` fragment: units sellable under `roomTypeId`. */
export const unitsSoldAs = (roomTypeId: string): Prisma.RoomWhereInput => ({
  OR: [{ roomTypeId }, { sharedWith: { some: { roomTypeId } } }],
});

/**
 * ACTIVE unit ids per listing, owned and shared alike (a shared apartment
 * appears under every listing that sells it). One small query - the hotel
 * has a handful of units - so callers can count or intersect without a
 * per-type round trip.
 */
export async function activeUnitsByRoomType(): Promise<Map<string, string[]>> {
  const { default: prisma, RoomStatus } = await import('@/lib/prisma');
  const rooms = await prisma.room.findMany({
    where: { status: RoomStatus.ACTIVE },
    select: {
      id: true,
      roomTypeId: true,
      sharedWith: { select: { roomTypeId: true } },
    },
  });
  const index = new Map<string, string[]>();
  const add = (roomTypeId: string, roomId: string) => {
    const list = index.get(roomTypeId) ?? [];
    list.push(roomId);
    index.set(roomTypeId, list);
  };
  for (const room of rooms) {
    add(room.roomTypeId, room.id);
    for (const link of room.sharedWith) add(link.roomTypeId, room.id);
  }
  return index;
}
