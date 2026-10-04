import { z } from 'zod';
import {
  AreaCodeSchema,
  ItemCategorySchema,
  ItemConditionSchema,
} from './enums.js';

export const DISCOVERY_PAGE_DEFAULT = 20;
export const DISCOVERY_PAGE_MAX = 50;

/**
 * Query-string shape for GET /v1/discovery/listings. Every value arrives as
 * a string; limit is coerced. A blank search box is dropped rather than
 * searched for.
 */
export const DiscoveryQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
  category: ItemCategorySchema.optional(),
  area: AreaCodeSchema.optional(),
  condition: ItemConditionSchema.optional(),
  cursor: z.string().min(1).max(200).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(DISCOVERY_PAGE_MAX)
    .default(DISCOVERY_PAGE_DEFAULT),
});

/**
 * What a discovery card may show. The owner is a display name and avatar,
 * nothing that identifies or locates them; z.object strips anything else.
 */
export const DiscoveryListingSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  category: ItemCategorySchema,
  condition: ItemConditionSchema,
  areaCode: AreaCodeSchema,
  publishedAt: z.string(),
  owner: z.object({
    displayName: z.string(),
    avatarKey: z.string().nullable(),
  }),
});

/** nextCursor is opaque; pass it back unchanged for the following page. */
export const DiscoveryPageSchema = z.object({
  items: z.array(DiscoveryListingSchema),
  nextCursor: z.string().nullable(),
});

export const AreaListingCountsSchema = z.array(
  z.object({ areaCode: AreaCodeSchema, count: z.number().int().min(0) }),
);

export type DiscoveryQuery = z.infer<typeof DiscoveryQuerySchema>;
export type DiscoveryListing = z.infer<typeof DiscoveryListingSchema>;
export type DiscoveryPage = z.infer<typeof DiscoveryPageSchema>;
export type AreaListingCounts = z.infer<typeof AreaListingCountsSchema>;
