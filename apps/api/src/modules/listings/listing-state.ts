import { HttpStatus } from '@nestjs/common';
import type { ListingStatus } from '@prisma/client';
import { PublicApiException } from '../../common/http/public-api.exception';

/**
 * EDIT/SUBMIT/WITHDRAW come from the owner; APPROVE/HIDE/EXPIRE from
 * screening, moderation and expiry. RESERVE/REOPEN/COMPLETE arrive with gift
 * transactions in Plan 3.
 */
export type ListingEvent =
  'EDIT' | 'SUBMIT' | 'WITHDRAW' | 'APPROVE' | 'HIDE' | 'EXPIRE';

/**
 * Every allowed move; anything absent is rejected. Notable choices:
 * - SUBMIT lands in PENDING_REVIEW, never PUBLISHED: screening decides.
 * - EDIT on a PUBLISHED listing sends it back to PENDING_REVIEW, so clean
 *   text cannot be published and then edited into a forbidden item.
 * - MODERATION_HIDDEN has no owner exits: withdrawing would erase what a
 *   report or appeal needs.
 */
const TRANSITIONS: Partial<
  Record<ListingStatus, Partial<Record<ListingEvent, ListingStatus>>>
> = {
  DRAFT: { EDIT: 'DRAFT', SUBMIT: 'PENDING_REVIEW', WITHDRAW: 'WITHDRAWN' },
  PENDING_REVIEW: {
    EDIT: 'PENDING_REVIEW',
    APPROVE: 'PUBLISHED',
    HIDE: 'MODERATION_HIDDEN',
    WITHDRAW: 'WITHDRAWN',
  },
  PUBLISHED: {
    EDIT: 'PENDING_REVIEW',
    WITHDRAW: 'WITHDRAWN',
    EXPIRE: 'EXPIRED',
    HIDE: 'MODERATION_HIDDEN',
  },
};

export function transitionListing(
  status: ListingStatus,
  event: ListingEvent,
): ListingStatus {
  const next = TRANSITIONS[status]?.[event];
  if (!next) {
    throw new PublicApiException(
      HttpStatus.CONFLICT,
      'LISTING_STATE_INVALID',
      'Không thể thực hiện thao tác này với bài đăng ở trạng thái hiện tại.',
    );
  }
  return next;
}

/**
 * The one definition of "anyone may see this listing". expiresAt is checked
 * here because nothing flips PUBLISHED to EXPIRED in the background.
 * RESERVED joins this set in Plan 3.
 */
export function isPubliclyVisible(
  listing: { status: ListingStatus; expiresAt: Date | null },
  now: Date,
): boolean {
  return (
    listing.status === 'PUBLISHED' &&
    (listing.expiresAt === null || listing.expiresAt > now)
  );
}
