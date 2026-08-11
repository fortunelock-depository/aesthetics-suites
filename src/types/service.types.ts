// src/types/service.types.ts
import type { IApiResponse, IPaginatedResponse } from '@/types/api';
import type { ManagedPhoto } from '@/components/admin/photos-manager';

/** Service as returned by the admin API. */
export interface IServiceRow {
  id: string;
  name: string;
  slug: string;
  eyebrow: string;
  summary: string;
  description: string;
  availability: string | null;
  highlights: string[];
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  photos?: (ManagedPhoto & { sortOrder: number })[];
}

export interface IServiceDetail extends IServiceRow {
  photos: (ManagedPhoto & { sortOrder: number })[];
}

export interface IServicesQueryParams {
  page: number;
  limit: number;
  search?: string;
  isPublished?: 'true' | 'false';
}

/** POST /api/admin/services body. */
export interface ICreateServiceBody {
  name: string;
  eyebrow: string;
  summary: string;
  description: string;
  availability?: string;
  highlights: string[];
  isPublished: boolean;
  sortOrder: number;
}

export type IUpdateServiceBody = Partial<
  Omit<ICreateServiceBody, 'availability'>
> & {
  /** null clears the saved hours. */
  availability?: string | null;
};

export type IServicesResponse = IPaginatedResponse<IServiceRow[]>;
export type IServiceResponse = IApiResponse<IServiceDetail>;
