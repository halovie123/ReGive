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

/**
 * A deploy-time mistake, not a runtime condition: deliberately not an
 * ApiProblemError, so safeGetMe() rethrows it instead of reporting the
 * user as signed out.
 */
export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigurationError';
  }
}

function apiBaseUrl(): string {
  const configured = process.env.API_BASE_URL;
  if (!configured) {
    // The localhost default is a dev convenience only. In production it
    // points at the serverless sandbox itself, which would make a missing
    // variable indistinguishable from a sleeping API.
    if (process.env.NODE_ENV === 'production') {
      throw new ApiConfigurationError(
        'Missing required environment variable: API_BASE_URL',
      );
    }
    return 'http://127.0.0.1:3001/v1';
  }
  return configured.replace(/\/$/, '');
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

const TIMEOUT_PROBLEM: ApiProblem = {
  code: 'API_TIMEOUT',
  message: 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.',
  correlationId: 'web-api-timeout',
};

const UNREACHABLE_PROBLEM: ApiProblem = {
  code: 'API_UNREACHABLE',
  message: 'Không kết nối được máy chủ. Vui lòng thử lại.',
  correlationId: 'web-api-unreachable',
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

  // Outside the try below: a configuration error must not be reported as
  // API_UNREACHABLE.
  const url = `${apiBaseUrl()}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: 'no-store',
      // The API runs on Render's free tier, which sleeps after ~15 minutes
      // idle; a cold start was measured at 42s. Without a bound, undici
      // would wait its 300s default and Vercel would hold the request open
      // that whole time. 60s clears a worst-case wake while still turning a
      // genuine outage into the app shell's error state rather than a hang.
      signal: init.signal ?? AbortSignal.timeout(60_000),
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    throw new ApiProblemError(
      (error as Error)?.name === 'TimeoutError'
        ? TIMEOUT_PROBLEM
        : UNREACHABLE_PROBLEM,
    );
  }

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
 *
 * A missing API_BASE_URL is the one failure it does not swallow: that is a
 * broken deploy, and hiding it would make every user look signed out.
 */
export async function safeGetMe(): Promise<MeResponse | null> {
  try {
    return await getMe();
  } catch (error) {
    if (error instanceof ApiConfigurationError) {
      throw error;
    }
    return null;
  }
}
