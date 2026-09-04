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
