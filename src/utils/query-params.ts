// src/utils/query-params.ts

/**
 * Builds a query string from a typed params object, skipping undefined/null
 * and empty strings - the ONE way list endpoints get their URLs (no ad hoc
 * string concatenation).
 *
 *   toQueryString('users', { page: 2, limit: 10, search: 'ann' })
 *   // -> "users?page=2&limit=10&search=ann"
 */
export function toQueryString<T extends object>(
  basePath: string,
  params: T,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, unknown][]) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}
