import { HttpStatus } from '@nestjs/common';
import type { z } from 'zod';
import { PublicApiException } from './public-api.exception';

/**
 * Validates a request body against a contract schema. Failures become a
 * generic Vietnamese INVALID_INPUT: the Zod issue list is never echoed, so
 * schema internals and rejected values stay out of the response.
 */
export function parseInput<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.output<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new PublicApiException(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'INVALID_INPUT',
    'Dữ liệu không hợp lệ.',
  );
}
