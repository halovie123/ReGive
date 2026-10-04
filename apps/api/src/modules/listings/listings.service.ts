import type { AreaCode, Listing, Prisma } from '@prisma/client';
import type {
  CreateListing,
  ListingResponse,
  UpdateListing,
} from '@buy-nothing/contracts';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PublicApiException } from '../../common/http/public-api.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assessListing } from './listing-risk';
import {
  effectiveStatus,
  isPubliclyVisible,
  transitionListing,
  type ListingEvent,
} from './listing-state';

type DatabaseClient = PrismaService | Prisma.TransactionClient;

/** How long a listing stays public after it is first published. */
const LISTING_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

const notFound = () =>
  new PublicApiException(
    HttpStatus.NOT_FOUND,
    'LISTING_NOT_FOUND',
    'Không tìm thấy bài đăng.',
  );

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateListing): Promise<ListingResponse> {
    return this.prisma.$transaction(async (transaction) => {
      await this.requireDonor(userId, transaction);
      await this.requireActiveArea(input.areaCode, transaction);
      const listing = await transaction.listing.create({
        data: { ownerId: userId, ...input },
      });
      return toResponse(listing, userId, new Date());
    });
  }

  /**
   * Anything the caller may not see -- someone else's draft, a pending or
   * hidden listing, an expired one -- answers exactly like a listing that
   * does not exist, so its existence is not revealed.
   */
  async get(userId: string, listingId: string): Promise<ListingResponse> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    const now = new Date();
    if (
      !listing ||
      (listing.ownerId !== userId && !isPubliclyVisible(listing, now))
    ) {
      throw notFound();
    }
    return toResponse(listing, userId, now);
  }

  async update(
    userId: string,
    listingId: string,
    input: UpdateListing,
  ): Promise<ListingResponse> {
    return this.mutate(userId, listingId, 'EDIT', input);
  }

  /**
   * Screening decides where it lands: PUBLISHED, PENDING_REVIEW (held for a
   * moderator) or MODERATION_HIDDEN.
   */
  async submit(userId: string, listingId: string): Promise<ListingResponse> {
    return this.mutate(userId, listingId, 'SUBMIT');
  }

  async withdraw(userId: string, listingId: string): Promise<ListingResponse> {
    return this.mutate(userId, listingId, 'WITHDRAW');
  }

  /**
   * Marks PUBLISHED listings past their expiry as EXPIRED. Idempotent, and
   * only bookkeeping: every read already treats them as expired through
   * effectiveStatus(), so nothing depends on how often this runs.
   */
  async sweepExpired(now: Date = new Date()): Promise<number> {
    const { count } = await this.prisma.listing.updateMany({
      where: { status: 'PUBLISHED', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    });
    return count;
  }

  /**
   * Owner-only state change under a row lock, so two concurrent requests
   * (an edit racing a withdraw, say) cannot both read the old status and
   * each apply a transition that is only valid from it.
   *
   * Any change that lands in PENDING_REVIEW is screened in the same
   * transaction, against the text as it will be after this change.
   */
  private async mutate(
    userId: string,
    listingId: string,
    event: ListingEvent,
    input: UpdateListing = {},
  ): Promise<ListingResponse> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id" FROM "listings" WHERE "id" = ${listingId}::uuid FOR UPDATE
      `;
      const listing = await transaction.listing.findUnique({
        where: { id: listingId },
      });
      if (!listing) throw notFound();
      if (listing.ownerId !== userId) {
        throw new PublicApiException(
          HttpStatus.FORBIDDEN,
          'LISTING_FORBIDDEN',
          'Bạn không có quyền thay đổi bài đăng này.',
        );
      }
      const now = new Date();
      let status = transitionListing(effectiveStatus(listing, now), event);
      if (input.areaCode) {
        await this.requireActiveArea(input.areaCode, transaction);
      }

      const dates: { publishedAt?: Date; expiresAt?: Date } = {};
      if (status === 'PENDING_REVIEW') {
        const next = { ...listing, ...input };
        if (next.defects.trim() === '') {
          throw new PublicApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            'LISTING_INCOMPLETE',
            'Hãy mô tả khuyết điểm của vật phẩm, hoặc ghi “Không có”.',
          );
        }
        const assessment = assessListing(next);
        await transaction.listingRiskAssessment.create({
          data: {
            listingId,
            level: assessment.level,
            reasons: assessment.reasons,
          },
        });
        if (assessment.level === 'HIGH') {
          status = transitionListing(status, 'HIDE');
        } else if (assessment.level === 'LOW') {
          status = transitionListing(status, 'APPROVE');
          // First publication sets the dates; a later edit keeps them, so
          // editing cannot bump a listing up the feed or extend its life.
          dates.publishedAt = listing.publishedAt ?? now;
          dates.expiresAt =
            listing.expiresAt ?? new Date(now.getTime() + LISTING_LIFETIME_MS);
        }
      }

      const updated = await transaction.listing.update({
        where: { id: listingId },
        data: { ...input, ...dates, status },
      });
      return toResponse(updated, userId, now);
    });
  }

  private async requireDonor(
    userId: string,
    database: DatabaseClient,
  ): Promise<void> {
    const assignment = await database.roleAssignment.findUnique({
      where: { userId_role: { userId, role: 'DONOR' } },
      select: { role: true },
    });
    if (!assignment) {
      throw new PublicApiException(
        HttpStatus.FORBIDDEN,
        'DONOR_ROLE_REQUIRED',
        'Bạn cần đăng ký vai trò Người tặng để đăng vật phẩm.',
      );
    }
  }

  private async requireActiveArea(
    areaCode: AreaCode,
    database: DatabaseClient,
  ): Promise<void> {
    const area = await database.area.findUnique({
      where: { code: areaCode },
      select: { active: true },
    });
    if (!area?.active) {
      throw new PublicApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'AREA_UNAVAILABLE',
        'Khu vực không khả dụng.',
      );
    }
  }
}

function toResponse(
  listing: Listing,
  userId: string,
  now: Date,
): ListingResponse {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    defects: listing.defects,
    category: listing.category,
    condition: listing.condition,
    areaCode: listing.areaCode,
    status: effectiveStatus(listing, now),
    isOwner: listing.ownerId === userId,
    publishedAt: listing.publishedAt?.toISOString() ?? null,
    expiresAt: listing.expiresAt?.toISOString() ?? null,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}
