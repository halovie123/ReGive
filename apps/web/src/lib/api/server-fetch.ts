import { cache } from 'react';
import { MeResponseSchema, type MeResponse, type ApiProblem } from '@buy-nothing/contracts';
import { createClient } from '../supabase/server';
import { parseApiProblem } from './problem';

/** Thrown by apiFetch when the API responds with a non-2xx ApiProblem. */
export class ApiProblemError extends Error {
  readonly problem: ApiProblem;

  constructor(problem: ApiProblem) {
    super(problem.message);
    this.name = 'ApiProblemError';
    this.problem = problem;
  }
}

export function isApiProblemError(error: unknown): error is ApiProblemError {
  return error instanceof ApiProblemError;
}

function apiBaseUrl(): string {
  return (process.env.API_BASE_URL ?? 'http://127.0.0.1:3001/v1').replace(/\/$/, '');
}

async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

const NO_SESSION_PROBLEM: ApiProblem = {
  code: 'AUTH_REQUIRED',
  message: 'Bạn cần đăng nhập để tiếp tục.',
  correlationId: 'web-no-session',
};

/**
 * BFF fetch helper: reads the caller's Supabase session on the server and
 * forwards it as a bearer token to the NestJS API. Never exposes the token
 * to the browser — this only ever runs in Server Components, Server
 * Actions and Route Handlers.
 */
export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiProblemError(NO_SESSION_PROBLEM);
  }

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new ApiProblemError(parseApiProblem(body));
  }

  return body as T;
}

const INVALID_RESPONSE_PROBLEM: ApiProblem = {
  code: 'INVALID_RESPONSE',
  message: 'Phản hồi không hợp lệ từ máy chủ.',
  correlationId: 'web-invalid-response',
};

/**
 * Fetches the current user's profile (GET /v1/me), memoized per request via
 * React's cache() so multiple components (layout + page) can call it
 * without issuing duplicate requests.
 */
export const getMe = cache(async (): Promise<MeResponse> => {
  const body = await apiFetch<unknown>('/me');
  const result = MeResponseSchema.safeParse(body);
  if (!result.success) {
    throw new ApiProblemError(INVALID_RESPONSE_PROBLEM);
  }
  return result.data;
});

/**
 * Same as getMe(), but returns null instead of throwing. Use this in guard
 * checks so that redirect() (which itself throws) is never called from
 * inside a try/catch that would swallow it — fetch with safeGetMe first,
 * then branch and redirect() outside of any try block.
 */
export async function safeGetMe(): Promise<MeResponse | null> {
  try {
    return await getMe();
  } catch {
    return null;
  }
}
