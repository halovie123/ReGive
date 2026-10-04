import { z } from 'zod';
import {
  AreaCodeSchema,
  ItemCategorySchema,
  ItemConditionSchema,
  ListingStatusSchema,
} from './enums.js';

/**
 * Field limits shared by the API's column sizes and the web form. Exported
 * so neither side hard-codes them.
 */
export const LISTING_TITLE_MIN = 5;
export const LISTING_TITLE_MAX = 100;
export const LISTING_DESCRIPTION_MIN = 20;
export const LISTING_DESCRIPTION_MAX = 2000;
export const LISTING_DEFECTS_MAX = 800;

const listingFields = {
  title: z.string().trim().min(LISTING_TITLE_MIN).max(LISTING_TITLE_MAX),
  description: z
    .string()
    .trim()
    .min(LISTING_DESCRIPTION_MIN)
    .max(LISTING_DESCRIPTION_MAX),
  defects: z.string().trim().max(LISTING_DEFECTS_MAX),
  category: ItemCategorySchema,
  condition: ItemConditionSchema,
  areaCode: AreaCodeSchema,
};

/**
 * z.object strips unknown keys, which is relied on: a listing carries an
 * area, never an address or coordinates, so anything else a client sends is
 * dropped rather than persisted.
 */
export const CreateListingSchema = z.object({
  ...listingFields,
  defects: listingFields.defects.default(''),
});

export const UpdateListingSchema = z
  .object(listingFields)
  .partial()
  .refine((update) => Object.keys(update).length > 0, {
    message: 'Nothing to update',
  });

/**
 * isOwner instead of ownerId: the web needs to know whether to show edit
 * controls, not the owner's internal id.
 */
export const ListingResponseSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string(),
  defects: z.string(),
  category: ItemCategorySchema,
  condition: ItemConditionSchema,
  areaCode: AreaCodeSchema,
  status: ListingStatusSchema,
  isOwner: z.boolean(),
  publishedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateListing = z.infer<typeof CreateListingSchema>;
export type UpdateListing = z.infer<typeof UpdateListingSchema>;
export type ListingResponse = z.infer<typeof ListingResponseSchema>;
