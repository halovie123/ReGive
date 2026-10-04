import { z } from 'zod';

export const USER_ROLES = ['DONOR', 'RECIPIENT', 'VOLUNTEER'] as const;

/**
 * Service areas — district level across all of Ho Chi Minh City.
 *
 * Was originally four communes inside Hóc Môn district only. Expanded to
 * the whole city; the three commune codes (BA_DIEM, XUAN_THOI_SON,
 * DONG_THANH) folded into HOC_MON, which is itself a district, so no
 * member lost their area.
 */
export const AREA_CODES = [
  'QUAN_1',
  'QUAN_3',
  'QUAN_4',
  'QUAN_5',
  'QUAN_6',
  'QUAN_7',
  'QUAN_8',
  'QUAN_10',
  'QUAN_11',
  'QUAN_12',
  'THU_DUC',
  'BINH_THANH',
  'GO_VAP',
  'PHU_NHUAN',
  'TAN_BINH',
  'TAN_PHU',
  'BINH_TAN',
  'HOC_MON',
  'CU_CHI',
  'BINH_CHANH',
  'NHA_BE',
  'CAN_GIO',
] as const;

export const UserRoleSchema = z.enum(USER_ROLES);
export const AreaCodeSchema = z.enum(AREA_CODES);

export type UserRole = z.infer<typeof UserRoleSchema>;
export type AreaCode = z.infer<typeof AreaCodeSchema>;

/**
 * Lifecycle from the spec (section 7): DRAFT → PUBLISHED → RESERVED →
 * COMPLETED, plus withdrawal, expiry and moderation branches. PENDING_REVIEW
 * sits between DRAFT and PUBLISHED so nothing goes public unscreened.
 */
export const LISTING_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'RESERVED',
  'COMPLETED',
  'WITHDRAWN',
  'EXPIRED',
  'MODERATION_HIDDEN',
] as const;

/**
 * The only five categories the MVP accepts. Money, medicine, perishable food
 * and dangerous goods are excluded by having no category at all.
 */
export const ITEM_CATEGORIES = [
  'HOUSEHOLD',
  'CLOTHING',
  'BOOKS',
  'CHILDREN',
  'DEVICES',
] as const;

export const ITEM_CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const;

export const ListingStatusSchema = z.enum(LISTING_STATUSES);
export const ItemCategorySchema = z.enum(ITEM_CATEGORIES);
export const ItemConditionSchema = z.enum(ITEM_CONDITIONS);

export type ListingStatus = z.infer<typeof ListingStatusSchema>;
export type ItemCategory = z.infer<typeof ItemCategorySchema>;
export type ItemCondition = z.infer<typeof ItemConditionSchema>;
