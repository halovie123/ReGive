import { describe, expect, it } from 'vitest';
import {
  CreateListingSchema,
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  LISTING_STATUSES,
  ListingResponseSchema,
  UpdateListingSchema,
} from './index.js';

const validListing = {
  title: 'Bộ sách giáo khoa lớp 5',
  description: 'Đủ 10 cuốn, còn sạch, có bọc bìa. Phù hợp cho năm học mới.',
  defects: 'Hai cuốn bị quăn góc',
  category: 'BOOKS',
  condition: 'GOOD',
  areaCode: 'HOC_MON',
} as const;

describe('listing contracts', () => {
  /**
   * The spec allows exactly these five categories. Money, medicine,
   * perishable food and dangerous goods have no category on purpose, so a
   * new value here is a product decision, not a code change.
   */
  it('allows only the five MVP categories', () => {
    expect(ITEM_CATEGORIES).toEqual([
      'HOUSEHOLD',
      'CLOTHING',
      'BOOKS',
      'CHILDREN',
      'DEVICES',
    ]);
  });

  it('publishes the full lifecycle and the four conditions', () => {
    expect(LISTING_STATUSES).toEqual([
      'DRAFT',
      'PENDING_REVIEW',
      'PUBLISHED',
      'RESERVED',
      'COMPLETED',
      'WITHDRAWN',
      'EXPIRED',
      'MODERATION_HIDDEN',
    ]);
    expect(ITEM_CONDITIONS).toEqual(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']);
  });

  it('accepts a complete listing and trims its text', () => {
    const parsed = CreateListingSchema.parse({
      ...validListing,
      title: `  ${validListing.title}  `,
    });

    expect(parsed.title).toBe(validListing.title);
  });

  it('defaults defects to empty rather than requiring the field', () => {
    const { defects: _defects, ...withoutDefects } = validListing;

    expect(CreateListingSchema.parse(withoutDefects).defects).toBe('');
  });

  it.each([
    ['a title under 5 characters', { title: 'Tủ' }],
    ['a title over 100 characters', { title: 'x'.repeat(101) }],
    ['a description under 20 characters', { description: 'Còn tốt' }],
    ['a description over 2000 characters', { description: 'x'.repeat(2001) }],
    ['defects over 800 characters', { defects: 'x'.repeat(801) }],
    ['a category outside the MVP list', { category: 'FOOD' }],
    ['an unknown condition', { condition: 'BROKEN' }],
    ['an area outside the 22 districts', { areaCode: 'DISTRICT_1' }],
  ])('rejects %s', (_label, override) => {
    expect(
      CreateListingSchema.safeParse({ ...validListing, ...override }).success,
    ).toBe(false);
  });

  /**
   * A precise location must never travel with a listing: the spec stores an
   * area, never an address. Unknown keys are stripped so a client that
   * sends one cannot get it persisted or echoed back.
   */
  it('drops an address or coordinates sent alongside a listing', () => {
    const parsed = CreateListingSchema.parse({
      ...validListing,
      address: '12 Nguyễn Ảnh Thủ',
      lat: 10.88,
      lng: 106.59,
    });

    expect(parsed).not.toHaveProperty('address');
    expect(parsed).not.toHaveProperty('lat');
  });

  it('accepts a partial update but not an empty one', () => {
    expect(UpdateListingSchema.parse({ condition: 'FAIR' })).toEqual({
      condition: 'FAIR',
    });
    expect(UpdateListingSchema.safeParse({}).success).toBe(false);
  });

  it('describes a listing without exposing who owns it', () => {
    const response = ListingResponseSchema.parse({
      id: 'listing-1',
      ...validListing,
      status: 'DRAFT',
      isOwner: true,
      publishedAt: null,
      expiresAt: null,
      createdAt: '2026-10-04T08:00:00.000Z',
      updatedAt: '2026-10-04T08:00:00.000Z',
    });

    expect(response).not.toHaveProperty('ownerId');
    expect(response.isOwner).toBe(true);
  });
});
