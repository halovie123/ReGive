import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CreateListingSchema,
  UpdateListingSchema,
  type ListingResponse,
} from '@buy-nothing/contracts';
import { parseInput } from '../../common/http/parse-input';
import { PublicApiException } from '../../common/http/public-api.exception';
import { CurrentUser } from '../identity/current-user.decorator';
import type { CurrentUser as AuthenticatedUser } from '../identity/identity.types';
import { JwtAuthGuard } from '../identity/jwt-auth.guard';
import { ListingsService } from './listings.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A malformed id cannot name a listing, so it gets the same 404 as a
 * missing one -- and never reaches the ::uuid cast, which would fail as a
 * 500.
 */
function listingId(id: string): string {
  if (UUID.test(id)) return id;
  throw new PublicApiException(
    HttpStatus.NOT_FOUND,
    'LISTING_NOT_FOUND',
    'Không tìm thấy bài đăng.',
  );
}

@Controller('listings')
@UseGuards(JwtAuthGuard)
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<ListingResponse> {
    return this.listings.create(
      currentUser.id,
      parseInput(CreateListingSchema, body),
    );
  }

  @Get(':id')
  get(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ListingResponse> {
    return this.listings.get(currentUser.id, listingId(id));
  }

  @Patch(':id')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ListingResponse> {
    return this.listings.update(
      currentUser.id,
      listingId(id),
      parseInput(UpdateListingSchema, body),
    );
  }

  /** Submits for screening; the response says where it landed. */
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ListingResponse> {
    return this.listings.submit(currentUser.id, listingId(id));
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  withdraw(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ListingResponse> {
    return this.listings.withdraw(currentUser.id, listingId(id));
  }
}
