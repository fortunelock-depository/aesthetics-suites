// src/types/facility.types.ts
import type { IApiResponse, IPaginatedResponse } from '@/types/api';
import type { ManagedPhoto } from './photo.types';

/** Facility as returned by the admin API. */
export interface IFacilityRow {
  id: string;
  name: string;
  slug: string;
  eyebrow: string;
  summary: string;
  description: string;
  openingHours: string | null;
  highlights: string[];
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  photos?: (ManagedPhoto & { sortOrder: number })[];
}

export interface IFacilityDetail extends IFacilityRow {
  photos: (ManagedPhoto & { sortOrder: number })[];
}

export interface IFacilitiesQueryParams {
  page: number;
  limit: number;
  search?: string;
  isPublished?: 'true' | 'false';
}

/** POST /api/admin/facilities body. */
export interface ICreateFacilityBody {
  name: string;
  eyebrow: string;
  summary: string;
  description: string;
  openingHours?: string;
  highlights: string[];
  isPublished: boolean;
  sortOrder: number;
}

export type IUpdateFacilityBody = Partial<
  Omit<ICreateFacilityBody, 'openingHours'>
> & {
  /** null clears the saved hours. */
  openingHours?: string | null;
};

export type IFacilitiesResponse = IPaginatedResponse<IFacilityRow[]>;
export type IFacilityResponse = IApiResponse<IFacilityDetail>;
