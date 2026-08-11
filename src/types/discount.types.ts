// src/types/discount.types.ts
import type { IApiResponse, IPaginatedResponse } from '@/types/api';

export type DiscountTypeValue = 'PERCENT' | 'FIXED';

export const DISCOUNT_TYPE_LABEL: Record<DiscountTypeValue, string> = {
  PERCENT: 'Percent off',
  FIXED: 'Fixed amount off',
};

/** Discount as returned by the admin API. */
export interface IDiscountRow {
  id: string;
  /** null = automatic (applies without a code). */
  code: string | null;
  name: string;
  type: DiscountTypeValue;
  /** PERCENT: whole percent (1-100). FIXED: minor units. */
  value: number;
  roomTypeId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  minNights: number | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roomType: { id: string; name: string } | null;
}

export interface IDiscountsQueryParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: 'true' | 'false';
}

/** POST /api/admin/discounts body. */
export interface ICreateDiscountBody {
  code?: string;
  name: string;
  type: DiscountTypeValue;
  value: number;
  roomTypeId?: string;
  startsAt?: string;
  endsAt?: string;
  minNights?: number;
  maxUses?: number;
  isActive: boolean;
}

/**
 * PATCH body - code/type/room are immutable after creation (a shared
 * code must keep meaning what it meant).
 */
export interface IUpdateDiscountBody {
  name?: string;
  value?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  minNights?: number | null;
  maxUses?: number | null;
  isActive?: boolean;
}

export type IDiscountsResponse = IPaginatedResponse<IDiscountRow[]>;
export type IDiscountResponse = IApiResponse<IDiscountRow>;
