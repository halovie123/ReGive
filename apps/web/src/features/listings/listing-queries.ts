import {
  DiscoveryPageSchema,
  ListingResponseSchema,
  type DiscoveryPage,
  type ListingResponse,
} from '@buy-nothing/contracts';
import { z } from 'zod';
import { ApiProblemError, apiFetch, isApiProblemError } from '@/lib/api/server-fetch';

const INVALID_RESPONSE = new ApiProblemError({
  code: 'INVALID_RESPONSE',
  message: 'Phản hồi không hợp lệ từ máy chủ.',
  correlationId: 'web-invalid-response',
});

function parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw INVALID_RESPONSE;
  return result.data;
}

/**
 * null when the listing does not exist or the caller may not see it (the
 * API answers both the same way); any other failure throws to the (app)
 * error boundary.
 */
export async function getListing(id: string): Promise<ListingResponse | null> {
  try {
    return parse(
      ListingResponseSchema,
      await apiFetch<unknown>(`/listings/${encodeURIComponent(id)}`),
    );
  } catch (error) {
    if (isApiProblemError(error) && error.problem.code === 'LISTING_NOT_FOUND') {
      return null;
    }
    throw error;
  }
}

export async function getMyListings(): Promise<ListingResponse[]> {
  return parse(
    z.array(ListingResponseSchema),
    await apiFetch<unknown>('/listings/mine'),
  );
}

export async function getDiscoveryPage(search: string): Promise<DiscoveryPage> {
  return parse(
    DiscoveryPageSchema,
    await apiFetch<unknown>(`/discovery/listings${search ? `?${search}` : ''}`),
  );
}
