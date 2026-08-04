import { z } from 'zod';

export const USER_ROLES = ['DONOR', 'RECIPIENT', 'VOLUNTEER'] as const;
export const AREA_CODES = [
  'HOC_MON',
  'BA_DIEM',
  'XUAN_THOI_SON',
  'DONG_THANH',
] as const;

export const UserRoleSchema = z.enum(USER_ROLES);
export const AreaCodeSchema = z.enum(AREA_CODES);

export type UserRole = z.infer<typeof UserRoleSchema>;
export type AreaCode = z.infer<typeof AreaCodeSchema>;
