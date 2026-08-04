import { z } from 'zod';

export const IdentityClaimsSchema = z.object({
  subject: z.string().min(1),
  sessionId: z.string().min(1),
});

export type IdentityClaims = z.infer<typeof IdentityClaimsSchema>;
