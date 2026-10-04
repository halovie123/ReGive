import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AreaCode, ItemCategory, ItemCondition } from '@prisma/client';
import type {
  AreaListingCounts,
  DiscoveryPage,
  DiscoveryQuery,
} from '@buy-nothing/contracts';
import { PublicApiException } from '../../common/http/public-api.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toSearchText } from '../../common/text/vietnamese';
import { ListingsService } from '../listings/listings.service';
import { decodeCursor, encodeCursor, type CursorPosition } from './cursor';

type DiscoveryRow = {
  id: string;
  title: string;
  category: ItemCategory;
  condition: ItemCondition;
  areaCode: AreaCode;
  publishedAt: Date;
  displayName: string;
  avatarKey: string | null;
};

/** How often discovery lets sweepExpired() run; it is bookkeeping only. */
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

/**
 * The public visibility rule, in SQL. Must agree with isPubliclyVisible()
 * in listing-state.ts, and adds one thing the row alone cannot know: the
 * owner's account must be active, so suspending someone takes their
 * listings out of discovery immediately.
 */
const VISIBLE = Prisma.sql`
  l."status" = 'PUBLISHED'
  AND l."expires_at" > now()
  AND u."status" = 'ACTIVE'
`;

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  private lastSweepAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly listingsService: ListingsService,
  ) {}

  async listings(query: DiscoveryQuery): Promise<DiscoveryPage> {
    const position = query.cursor ? this.position(query.cursor) : null;
    await this.sweepOccasionally();

    const conditions: Prisma.Sql[] = [VISIBLE];
    if (query.category) {
      conditions.push(
        Prisma.sql`l."category" = ${query.category}::"item_category"`,
      );
    }
    if (query.area) {
      conditions.push(Prisma.sql`l."area_code" = ${query.area}::"area_code"`);
    }
    if (query.condition) {
      conditions.push(
        Prisma.sql`l."condition" = ${query.condition}::"item_condition"`,
      );
    }
    const terms = query.q ? toSearchText(query.q) : '';
    if (terms) {
      // Same expression as listings_search_text_fts_idx, or the index is
      // not used.
      conditions.push(
        Prisma.sql`to_tsvector('simple', l."search_text") @@ plainto_tsquery('simple', ${terms})`,
      );
    }
    if (position) {
      conditions.push(
        Prisma.sql`(l."published_at", l."id") < (${position.publishedAt}::timestamptz, ${position.id}::uuid)`,
      );
    }

    // One extra row tells whether another page exists.
    const rows = await this.prisma.$queryRaw<DiscoveryRow[]>`
      SELECT l."id", l."title", l."category", l."condition",
             l."area_code" AS "areaCode", l."published_at" AS "publishedAt",
             COALESCE(p."display_name", 'Thành viên ReGive') AS "displayName",
             p."avatar_key" AS "avatarKey"
      FROM "listings" l
      JOIN "users" u ON u."id" = l."owner_id"
      LEFT JOIN "profiles" p ON p."user_id" = l."owner_id"
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY l."published_at" DESC, l."id" DESC
      LIMIT ${query.limit + 1}
    `;

    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      items: items.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        condition: row.condition,
        areaCode: row.areaCode,
        publishedAt: row.publishedAt.toISOString(),
        owner: { displayName: row.displayName, avatarKey: row.avatarKey },
      })),
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ publishedAt: last.publishedAt, id: last.id })
          : null,
    };
  }

  /** Every active area in declaration order, with zero counts included. */
  async areaCounts(): Promise<AreaListingCounts> {
    const rows = await this.prisma.$queryRaw<
      { areaCode: AreaCode; count: number }[]
    >`
      SELECT a."code" AS "areaCode", COUNT(l."id")::int AS "count"
      FROM "areas" a
      LEFT JOIN ("listings" l JOIN "users" u ON u."id" = l."owner_id")
        ON l."area_code" = a."code" AND ${VISIBLE}
      WHERE a."active" = true
      GROUP BY a."code"
      ORDER BY a."code"
    `;
    return rows;
  }

  private position(cursor: string): CursorPosition {
    const position = decodeCursor(cursor);
    if (position) return position;
    throw new PublicApiException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'INVALID_INPUT',
      'Dữ liệu không hợp lệ.',
    );
  }

  /**
   * Visibility never depends on this (VISIBLE checks expires_at), so a
   * failure is logged and swallowed rather than failing the page.
   */
  private async sweepOccasionally(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSweepAt < SWEEP_INTERVAL_MS) return;
    this.lastSweepAt = now;
    try {
      await this.listingsService.sweepExpired(new Date(now));
    } catch {
      this.logger.warn('Expired-listing sweep failed; will retry later.');
    }
  }
}
