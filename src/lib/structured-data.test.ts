// Room JSON-LD correctness.
//
// The money here is the risk: prices are stored in minor units (pesewas)
// and schema.org expects major units, so the `/100` is doing real work. If
// it is ever dropped, the site advertises a GHS 1,000 room to Google as
// GHS 100,000 - silently, in markup no human reads. The rating block has a
// similar trap: emitting AggregateRating with zero reviews is a structured
// data error that suppresses the rich result entirely.
import { describe, expect, it } from 'vitest';
import { hotelRoomJsonLd } from '@/lib/structured-data';

const room = {
  name: 'Deluxe Suite',
  slug: 'deluxe-suite',
  summary: 'A quiet suite.',
  // 10,000,000 pesewas = GHS 100,000.00
  basePrice: 10_000_000,
  currency: 'GHS',
  capacityAdults: 2,
  photos: [{ url: 'https://example.test/a.jpg' }],
  rating: null as { average: number; count: number } | null,
};

type Offer = {
  price: string;
  priceCurrency: string;
  priceValidUntil: string;
};
const offerOf = (data: Record<string, unknown>) =>
  data.offers as unknown as Offer;

describe('hotelRoomJsonLd', () => {
  it('advertises the price in major units, not pesewas', () => {
    const offer = offerOf(hotelRoomJsonLd(room));
    expect(offer.price).toBe('100000.00');
    expect(offer.priceCurrency).toBe('GHS');
  });

  it('carries a future priceValidUntil so the Offer is not flagged', () => {
    const offer = offerOf(hotelRoomJsonLd(room));
    expect(offer.priceValidUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(offer.priceValidUntil).getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  it('omits AggregateRating when nothing has been reviewed', () => {
    expect(hotelRoomJsonLd(room).aggregateRating).toBeUndefined();
    expect(
      hotelRoomJsonLd({ ...room, rating: { average: 0, count: 0 } })
        .aggregateRating,
    ).toBeUndefined();
  });

  it('includes AggregateRating once reviews exist', () => {
    const data = hotelRoomJsonLd({
      ...room,
      rating: { average: 4.25, count: 8 },
    });
    expect(data.aggregateRating).toMatchObject({
      '@type': 'AggregateRating',
      ratingValue: '4.3',
      reviewCount: 8,
    });
  });
});
