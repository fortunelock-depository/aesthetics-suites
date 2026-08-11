// src/types/user.types.ts
import type { IApiResponse, IPaginatedResponse } from '@/types/api';

export type UserRoleValue = 'SUPER_ADMIN' | 'ADMIN' | 'FRONT_DESK';

export const USER_ROLES: UserRoleValue[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'FRONT_DESK',
];

export const USER_ROLE_LABEL: Record<UserRoleValue, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  FRONT_DESK: 'Front Desk',
};

export interface IUser {
  id: string;
  email: string;
  fullname: string;
  phone: string | null;
  role: UserRoleValue;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Serialized user as returned by the API (dates as ISO strings). */
export interface IUserRow {
  id: string;
  email: string;
  fullname: string;
  phone: string | null;
  role: UserRoleValue;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IUsersQueryParams {
  page: number;
  limit: number;
  search?: string;
  role?: UserRoleValue;
}

export type IUsersResponse = IPaginatedResponse<IUserRow[]>;
export type IUserResponse = IApiResponse<IUserRow>;
