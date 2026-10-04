import type { ListingStatus } from '@prisma/client';
import { PublicApiException } from '../../common/http/public-api.exception';
import {
  isPubliclyVisible,
  transitionListing,
  type ListingEvent,
} from './listing-state';

const rejection = (status: ListingStatus, event: ListingEvent): unknown => {
  try {
    transitionListing(status, event);
  } catch (error: unknown) {
    return error;
  }
  throw new Error(`${status} + ${event} was accepted`);
};

describe('transitionListing', () => {
  it.each<[ListingStatus, ListingEvent, ListingStatus]>([
    ['DRAFT', 'EDIT', 'DRAFT'],
    ['DRAFT', 'SUBMIT', 'PENDING_REVIEW'],
    ['DRAFT', 'WITHDRAW', 'WITHDRAWN'],
    ['PENDING_REVIEW', 'EDIT', 'PENDING_REVIEW'],
    ['PENDING_REVIEW', 'APPROVE', 'PUBLISHED'],
    ['PENDING_REVIEW', 'HIDE', 'MODERATION_HIDDEN'],
    ['PENDING_REVIEW', 'WITHDRAW', 'WITHDRAWN'],
    ['PUBLISHED', 'WITHDRAW', 'WITHDRAWN'],
    ['PUBLISHED', 'EXPIRE', 'EXPIRED'],
    ['PUBLISHED', 'HIDE', 'MODERATION_HIDDEN'],
  ])('%s + %s → %s', (from, event, to) => {
    expect(transitionListing(from, event)).toBe(to);
  });

  /**
   * Editing a live listing sends it back for screening. Otherwise a donor
   * could publish clean text and then edit it into a forbidden item, and
   * it would stay public without ever being looked at again.
   */
  it('sends an edited published listing back to review', () => {
    expect(transitionListing('PUBLISHED', 'EDIT')).toBe('PENDING_REVIEW');
  });

  it.each<[ListingStatus, ListingEvent]>([
    ['COMPLETED', 'EDIT'],
    ['MODERATION_HIDDEN', 'EDIT'],
    ['MODERATION_HIDDEN', 'SUBMIT'],
    ['WITHDRAWN', 'SUBMIT'],
    ['EXPIRED', 'EDIT'],
    ['PUBLISHED', 'SUBMIT'],
    ['DRAFT', 'APPROVE'],
    ['WITHDRAWN', 'WITHDRAW'],
  ])('rejects %s + %s as LISTING_STATE_INVALID', (from, event) => {
    const error = rejection(from, event);

    expect(error).toBeInstanceOf(PublicApiException);
    expect(error).toMatchObject({
      status: 409,
      publicProblem: { code: 'LISTING_STATE_INVALID' },
    });
  });

  /**
   * A moderator hid it for a reason. Letting the owner withdraw it would
   * erase the evidence a report or appeal (Plan 5) needs.
   */
  it('does not let the owner withdraw a hidden listing', () => {
    expect(rejection('MODERATION_HIDDEN', 'WITHDRAW')).toMatchObject({
      publicProblem: { code: 'LISTING_STATE_INVALID' },
    });
  });
});

describe('isPubliclyVisible', () => {
  const now = new Date('2026-10-04T08:00:00.000Z');

  it('shows a published listing that has not expired', () => {
    expect(
      isPubliclyVisible(
        { status: 'PUBLISHED', expiresAt: new Date('2026-10-05T00:00:00Z') },
        now,
      ),
    ).toBe(true);
  });

  /**
   * There is no background job to flip PUBLISHED to EXPIRED (no Redis on the
   * free tier), so expiry has to be enforced at read time.
   */
  it('hides a published listing past its expiry even before anything marks it EXPIRED', () => {
    expect(
      isPubliclyVisible(
        { status: 'PUBLISHED', expiresAt: new Date('2026-10-04T07:59:59Z') },
        now,
      ),
    ).toBe(false);
  });

  it.each<ListingStatus>([
    'DRAFT',
    'PENDING_REVIEW',
    'WITHDRAWN',
    'EXPIRED',
    'MODERATION_HIDDEN',
  ])('never shows a %s listing', (status) => {
    expect(isPubliclyVisible({ status, expiresAt: null }, now)).toBe(false);
  });
});
