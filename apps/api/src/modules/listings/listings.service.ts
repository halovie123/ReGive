import type { AreaCode, Listing, Prisma } from '@prisma/client';
import type {
  CreateListing,
  ListingResponse,
  UpdateListing,
} from '@buy-nothing/contracts';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PublicApiException } from '../../common/http/public-api.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  isPubliclyVisible,
  transitionListing,
  type ListingEvent,
} from './listing-state';

type DatabaseClient = PrismaService | Prisma.TransactionClient;

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
      return toResponse(listing, userId);
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
    if (
      !listing ||
      (listing.ownerId !== userId && !isPubliclyVisible(listing, new Date()))
    ) {
      throw notFound();
    }
    return toResponse(listing, userId);
  }

  async update(
    userId: string,
    listingId: string,
    input: UpdateListing,
  ): Promise<ListingResponse> {
    return this.mutate(userId, listingId, 'EDIT', async (transaction) => {
      if (input.areaCode) {
        await this.requireActiveArea(input.areaCode, transaction);
      }
      return input;
    });
  }

  /** Always lands in PENDING_REVIEW; screening decides what goes public. */
  async submit(userId: string, listingId: string): Promise<ListingResponse> {
    return this.mutate(userId, listingId, 'SUBMIT');
  }

  async withdraw(userId: string, listingId: string): Promise<ListingResponse> {
    return this.mutate(userId, listingId, 'WITHDRAW');
  }

  /**
   * Owner-only state change under a row lock, so two concurrent requests
   * (an edit racing a withdraw, say) cannot both read the old status and
   * each apply a transition that is only valid from it.
   */
  private async mutate(
    userId: string,
    listingId: string,
    event: ListingEvent,
    changes?: (
      transaction: Prisma.TransactionClient,
    ) => Promise<Prisma.ListingUpdateInput>,
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
      const status = transitionListing(listing.status, event);
      const data = changes ? await changes(transaction) : {};
      const updated = await transaction.listing.update({
        where: { id: listingId },
        data: { ...data, status },
      });
      return toResponse(updated, userId);
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

function toResponse(listing: Listing, userId: string): ListingResponse {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    defects: listing.defects,
    category: listing.category,
    condition: listing.condition,
    areaCode: listing.areaCode,
    status: listing.status,
    isOwner: listing.ownerId === userId,
    publishedAt: listing.publishedAt?.toISOString() ?? null,
    expiresAt: listing.expiresAt?.toISOString() ?? null,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}
