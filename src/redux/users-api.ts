// src/redux/users-api.ts
import { apiSlice } from './api-slice';
import { toQueryString } from '@/utils/query-params';
import type { IApiResponse } from '@/types/api';
import type {
  IUserResponse,
  IUsersQueryParams,
  IUsersResponse,
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
    updateUser: builder.mutation<
      IUserResponse,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({ url: `users/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'Users', id: 'LIST' },
      ],
    }),
    createUser: builder.mutation<IUserResponse, Record<string, unknown>>({
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
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = usersApi;
