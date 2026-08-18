// src/types/room.types.ts
import type { IApiResponse, IPaginatedResponse } from '@/types/api';

export interface IRoomFaq {
  question: string;
  answer: string;
}

export interface IRoomPhoto {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

export type RoomUnitStatus = 'ACTIVE' | 'MAINTENANCE';

export const ROOM_UNIT_STATUSES: RoomUnitStatus[] = ['ACTIVE', 'MAINTENANCE'];

export const ROOM_UNIT_STATUS_LABEL: Record<RoomUnitStatus, string> = {
  ACTIVE: 'Active',
  MAINTENANCE: 'Maintenance',
};

/** A physical unit of a room type, as serialized by the admin API. */
export interface IRoomUnitRow {
  id: string;
  roomTypeId: string;
  name: string;
  floor: string | null;
  status: RoomUnitStatus;
  notes: string | null;
  icalToken: string;
  airbnbIcalUrl: string | null;
  icalLastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Sibling listings this unit is ALSO sold under (detail payload only). */
  sharedWith?: { id: string; name: string }[];
}

/**
 * A unit owned by another listing that this one also sells (a two-bedroom
 * apartment sold whole AND as a single bedroom). Booking it under either
 * listing takes the physical unit for both.
 */
export interface ISharedUnitRow extends IRoomUnitRow {
  roomType: { id: string; name: string };
}

/** A unit that could be shared into a listing (owned by a sibling). */
export interface ISharedUnitCandidate {
  id: string;
  name: string;
  floor: string | null;
  status: RoomUnitStatus;
  roomType: { id: string; name: string };
}

export interface ISeasonRateRow {
  id: string;
  roomTypeId: string;
  name: string;
  /** YYYY-MM-DD (dates serialize as ISO strings). */
  startDate: string;
  endDate: string;
  /** Minor units per night. */
  nightlyPrice: number;
  minNights: number | null;
}

/** Room type as returned by the admin list (cover photo + counts). */
export interface IRoomTypeRow {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  basePrice: number;
  currency: string;
  capacityAdults: number;
  capacityChildren: number;
  sizeSqm: number | null;
  amenities: string[];
  faqs: IRoomFaq[];
  airbnbUrl: string | null;
  minNights: number;
  isPublished: boolean;
  sortOrder: number;
  baseOccupancy: number;
  extraGuestFeePerNight: number;
  freeCancellationDays: number;
  createdAt: string;
  updatedAt: string;
  photos?: IRoomPhoto[];
  /** units = owned; sharedUnits = sold here but owned by a sibling. */
  _count?: { units: number; sharedUnits?: number; bookings: number };
}

/** Full detail payload: photos, units and season rates included. */
export interface IRoomTypeDetail extends IRoomTypeRow {
  photos: IRoomPhoto[];
  units: IRoomUnitRow[];
  sharedUnits: ISharedUnitRow[];
  seasonRates: ISeasonRateRow[];
}

/** Total sellable units of a listing: owned plus shared into it. */
export const sellableUnitCount = (
  roomType: Pick<IRoomTypeRow, '_count'>,
): number =>
  (roomType._count?.units ?? 0) + (roomType._count?.sharedUnits ?? 0);

export interface IRoomTypesQueryParams {
  page: number;
  limit: number;
  search?: string;
  /** Serialized boolean - the API coerces 'true'/'false'. */
  isPublished?: 'true' | 'false';
}

/** POST /api/admin/room-types body (money already in minor units). */
export interface ICreateRoomTypeBody {
  name: string;
  summary: string;
  description: string;
  basePrice: number;
  capacityAdults: number;
  capacityChildren: number;
  sizeSqm?: number;
  amenities: string[];
  faqs: IRoomFaq[];
  airbnbUrl?: string;
  minNights: number;
  isPublished: boolean;
  sortOrder: number;
  baseOccupancy: number;
  extraGuestFeePerNight: number;
  freeCancellationDays: number;
}

export type IUpdateRoomTypeBody = Partial<
  Omit<ICreateRoomTypeBody, 'airbnbUrl'>
> & {
  /** null clears the saved link. */
  airbnbUrl?: string | null;
};

export interface ICreateRoomUnitBody {
  roomTypeId: string;
  name: string;
  floor?: string;
  status: RoomUnitStatus;
  notes?: string;
  airbnbIcalUrl?: string;
}

export type IUpdateRoomUnitBody = Partial<
  Omit<ICreateRoomUnitBody, 'roomTypeId' | 'airbnbIcalUrl'>
> & {
  airbnbIcalUrl?: string | null;
};

export interface ICreateSeasonRateBody {
  roomTypeId: string;
  name: string;
  startDate: string;
  endDate: string;
  nightlyPrice: number;
  minNights?: number;
}

export type IUpdateSeasonRateBody = Partial<
  Omit<ICreateSeasonRateBody, 'roomTypeId' | 'minNights'>
> & {
  minNights?: number | null;
};

export type ISharedUnitsResponse = IApiResponse<{
  linked: ISharedUnitCandidate[];
  candidates: ISharedUnitCandidate[];
}>;

export type IRoomTypesResponse = IPaginatedResponse<IRoomTypeRow[]>;
export type IRoomTypeResponse = IApiResponse<IRoomTypeDetail>;
export type IRoomUnitResponse = IApiResponse<IRoomUnitRow>;
export type ISeasonRateResponse = IApiResponse<ISeasonRateRow>;
