import { z } from 'zod';
import { AreaCodeSchema, UserRoleSchema } from './enums.js';

export const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(300).default(''),
});

export const UpdateRolesSchema = z.object({
  roles: z.array(UserRoleSchema).min(1),
});

export const UpdateActiveRoleSchema = z.object({
  activeRole: UserRoleSchema,
});

/**
 * How many service areas one member may claim. Exported so the API's
 * service-level backstop, the web form's live counter, and this schema all
 * read the same number instead of hard-coding it three times.
 */
export const MIN_AREAS = 1;
export const MAX_AREAS = 4;

export const UpdateAreasSchema = z.object({
  areas: z.array(AreaCodeSchema).min(MIN_AREAS).max(MAX_AREAS),
});

export const MeResponseSchema = z.object({
  id: z.string().min(1),
  phoneVerified: z.boolean(),
  phoneLast4: z.string().length(4).nullable(),
  profile: z
    .object({
      displayName: z.string(),
      bio: z.string(),
      avatarKey: z.string().nullable(),
    })
    .nullable(),
  roles: z.array(UserRoleSchema),
  activeRole: UserRoleSchema.nullable(),
  areas: z.array(AreaCodeSchema),
});

export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type UpdateRoles = z.infer<typeof UpdateRolesSchema>;
export type UpdateActiveRole = z.infer<typeof UpdateActiveRoleSchema>;
export type UpdateAreas = z.infer<typeof UpdateAreasSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
