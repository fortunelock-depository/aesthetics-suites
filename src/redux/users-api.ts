// src/redux/users-api.ts
import { apiSlice } from './api-slice';
import { toQueryString } from '@/utils/query-params';
import type { IApiResponse } from '@/types/api';
import type {
  ICreateUserBody,
  IUpdateUserDetailsBody,
  IUserResponse,
  IUsersQueryParams,
  IUsersResponse,
  UserRoleValue,
} from '@/types/user.types';

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<IUsersResponse, IUsersQueryParams>({
      query: (params) => toQueryString('users', params),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'Users' as const, id: 'LIST' },
            ]
          : [{ type: 'Users' as const, id: 'LIST' }],
    }),
    getUser: builder.query<IUserResponse, string>({
      query: (id) => `users/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),
    updateUser: builder.mutation<
      IUserResponse,
      { id: string; body: IUpdateUserDetailsBody }
    >({
      query: ({ id, body }) => ({ url: `users/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'Users', id: 'LIST' },
      ],
    }),
    updateUserRole: builder.mutation<
      IUserResponse,
      { id: string; role: UserRoleValue }
    >({
      query: ({ id, role }) => ({
        url: `users/${id}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'Users', id: 'LIST' },
      ],
    }),
    adminResetPassword: builder.mutation<
      IApiResponse<{ id: string }>,
      { id: string; password: string; confirmPassword: string }
    >({
      query: ({ id, ...body }) => ({
        url: `users/${id}/password`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'User', id }],
    }),
    adminDisableTwoFactor: builder.mutation<
      IApiResponse<{ id: string }>,
      string
    >({
      query: (id) => ({ url: `users/${id}/2fa/disable`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'Users', id: 'LIST' },
      ],
    }),
    createUser: builder.mutation<IUserResponse, ICreateUserBody>({
      query: (body) => ({ url: 'users', method: 'POST', body }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }, 'Overview'],
    }),
    deleteUser: builder.mutation<IApiResponse<{ id: string }>, string>({
      query: (id) => ({ url: `users/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'Users', id: 'LIST' },
        'Overview',
      ],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserRoleMutation,
  useAdminResetPasswordMutation,
  useAdminDisableTwoFactorMutation,
  useDeleteUserMutation,
} = usersApi;
