import { describe, expect, it } from 'vitest';
import {
  AreaListingCountsSchema,
  DISCOVERY_PAGE_MAX,
  DiscoveryPageSchema,
  DiscoveryQuerySchema,
} from './index.js';

describe('discovery contracts', () => {
  it('parses query-string values, defaulting the page size', () => {
    expect(
      DiscoveryQuerySchema.parse({
        q: '  giáo khoa ',
        category: 'BOOKS',
        area: 'HOC_MON',
        condition: 'GOOD',
        cursor: 'abc',
      }),
    ).toEqual({
      q: 'giáo khoa',
      category: 'BOOKS',
      area: 'HOC_MON',
      condition: 'GOOD',
      cursor: 'abc',
      limit: 20,
    });
  });

  it('reads limit from a string and caps it', () => {
    expect(DiscoveryQuerySchema.parse({ limit: '5' }).limit).toBe(5);
    expect(
      DiscoveryQuerySchema.safeParse({ limit: String(DISCOVERY_PAGE_MAX + 1) })
        .success,
    ).toBe(false);
    expect(DiscoveryQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
  });

  it('treats an empty search box as no search', () => {
    expect(DiscoveryQuerySchema.parse({ q: '   ' }).q).toBeUndefined();
  });

  it.each([
    ['an unknown category', { category: 'FOOD' }],
    ['an area outside the 22 districts', { area: 'DISTRICT_1' }],
    ['an overlong search', { q: 'x'.repeat(101) }],
  ])('rejects %s', (_label, query) => {
    expect(DiscoveryQuerySchema.safeParse(query).success).toBe(false);
  });

  /**
   * A discovery card names the donor by display name and avatar only. No
   * owner id, no provider subject, no contact detail, and no location finer
   * than the area.
   */
  it('publishes cards with a public owner summary only', () => {
    const page = DiscoveryPageSchema.parse({
      items: [
        {
          id: 'listing-1',
          title: 'Bộ sách giáo khoa lớp 5',
          category: 'BOOKS',
          condition: 'GOOD',
          areaCode: 'HOC_MON',
          publishedAt: '2026-10-04T08:00:00.000Z',
          owner: {
            displayName: 'Lan',
            avatarKey: null,
            providerSubject: 'google-oauth2|123',
          },
          ownerId: 'user-1',
        },
      ],
      nextCursor: null,
    });

    expect(page.items[0]).not.toHaveProperty('ownerId');
    expect(page.items[0].owner).toEqual({ displayName: 'Lan', avatarKey: null });
  });

  it('counts listings per area', () => {
    expect(
      AreaListingCountsSchema.parse([{ areaCode: 'QUAN_1', count: 3 }]),
    ).toEqual([{ areaCode: 'QUAN_1', count: 3 }]);
  });
});
