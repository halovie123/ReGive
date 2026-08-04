import { z } from 'zod';

export const ApiProblemSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  correlationId: z.string().min(1),
  details: z.unknown().optional(),
});

export type ApiProblem = z.infer<typeof ApiProblemSchema>;
