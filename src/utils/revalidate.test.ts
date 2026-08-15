// Which paths each helper purges.
//
// This file has already produced one silent production bug: the services
// mutation routes called `revalidatePublicFacilities`, so editing a service
// purged a page that does not exist while /services served stale content
// for an hour. Nothing failed, nothing logged. Asserting the exact paths is
// cheap insurance against the next mismatch of that shape.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
vi.mock('server-only', () => ({}));

const {
  revalidatePublicRooms,
  revalidatePublicFacilities,
  revalidatePublicServices,
} = await import('@/utils/revalidate');

beforeEach(() => revalidatePath.mockClear());

const purged = () => revalidatePath.mock.calls.map(([p]) => p as string);

describe('revalidatePublicRooms', () => {
  it('purges the home page, the listing, the detail page and the sitemap', () => {
    revalidatePublicRooms('deluxe-suite');
    expect(purged()).toEqual([
      '/',
      '/rooms',
      '/rooms/deluxe-suite',
      '/sitemap.xml',
    ]);
  });

  it('skips the detail page when no slug is given', () => {
    revalidatePublicRooms();
    expect(purged()).toEqual(['/', '/rooms', '/sitemap.xml']);
  });
});

describe('revalidatePublicFacilities', () => {
  it('purges its own surfaces, never the rooms or services ones', () => {
    revalidatePublicFacilities('spa');
    expect(purged()).toEqual([
      '/',
      '/facilities',
      '/facilities/spa',
      '/sitemap.xml',
    ]);
  });
});

describe('revalidatePublicServices', () => {
  it('purges /services, not /facilities - the exact bug that shipped', () => {
    revalidatePublicServices('airport-pickup');
    expect(purged()).toEqual([
      '/',
      '/services',
      '/services/airport-pickup',
      '/sitemap.xml',
    ]);
    expect(purged().some((p) => p.startsWith('/facilities'))).toBe(false);
  });
});
