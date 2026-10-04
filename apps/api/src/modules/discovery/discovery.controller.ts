import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  DiscoveryQuerySchema,
  type AreaListingCounts,
  type DiscoveryPage,
} from '@buy-nothing/contracts';
import { parseInput } from '../../common/http/parse-input';
import { JwtAuthGuard } from '../identity/jwt-auth.guard';
import { DiscoveryService } from './discovery.service';

/** Signed-in only: the spec keeps the marketplace behind sign-in. */
@Controller('discovery')
@UseGuards(JwtAuthGuard)
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get('listings')
  listings(@Query() query: unknown): Promise<DiscoveryPage> {
    return this.discovery.listings(parseInput(DiscoveryQuerySchema, query));
  }

  @Get('areas')
  areas(): Promise<AreaListingCounts> {
    return this.discovery.areaCounts();
  }
}
