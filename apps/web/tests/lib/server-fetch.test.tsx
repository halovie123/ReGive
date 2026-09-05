import { ApiProblemError, apiFetch, safeGetMe } from '@/lib/api/server-fetch';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const createClientMock = vi.mocked(createClient);

/** Minimal stand-in for the bits of the Supabase client apiFetch touches. */
function mockSession(accessToken: string | null) {
  createClientMock.mockResolvedValue({
    auth: {
      getSession: async () => ({
        data: { session: accessToken ? { access_token: accessToken } : null },
      }),
    },
  } as never);
}

const VALID_ME = {
  id: 'user-1',
  phoneVerified: false,
  phoneLast4: null,
  profile: { displayName: 'Lan', bio: '', avatarKey: null },
  roles: ['DONOR'],
  activeRole: 'DONOR',
  areas: ['HOC_MON'],
};

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createClientMock.mockReset();
  });

  it('refuses to call the API at all without a session', async () => {
    mockSession(null);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(apiFetch('/me')).rejects.toMatchObject({
      problem: { code: 'AUTH_REQUIRED' },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forwards the session as a bearer token and never leaks it into the path', async () => {
    mockSession('token-abc');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(VALID_ME), { status: 200 }));

    await apiFetch('/me');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).not.toContain('token-abc');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token-abc');
  });

  /**
   * The API sleeps on Render's free tier (a cold start was measured at 42s).
   * Before the timeout was added, undici waited its 300s default and Vercel
   * held the request open. These two assert the bound exists and that both
   * failure shapes become typed Vietnamese problems rather than raw
   * TypeErrors reaching a Server Component.
   */
  it('sets an abort signal so a sleeping API cannot hang the request forever', async () => {
    mockSession('token-abc');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(VALID_ME), { status: 200 }));

    await apiFetch('/me');

    expect(fetchSpy.mock.calls[0][1]?.signal).toBeDefined();
  });

  it('maps a timeout to API_TIMEOUT', async () => {
    mockSession('token-abc');
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(timeout);

    await expect(apiFetch('/me')).rejects.toMatchObject({
      problem: { code: 'API_TIMEOUT' },
    });
  });

  it('maps a connection failure to API_UNREACHABLE', async () => {
    mockSession('token-abc');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

    await expect(apiFetch('/me')).rejects.toMatchObject({
      problem: { code: 'API_UNREACHABLE' },
    });
  });

  it('surfaces the API problem body on a non-2xx response', async () => {
    mockSession('token-abc');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ code: 'ROLE_NOT_ASSIGNED', message: 'Vai trò chưa đăng ký.', correlationId: 'c-1' }),
        { status: 422 },
      ),
    );

    await expect(apiFetch('/me/active-role')).rejects.toMatchObject({
      problem: { code: 'ROLE_NOT_ASSIGNED' },
    });
  });
});

describe('safeGetMe', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createClientMock.mockReset();
  });

  /**
   * Regression guard for a shipped bug: the OAuth callback route has no
   * try/catch and no error boundary, so when it used the throwing getMe()
   * a brand-new user whose first request hit a cold API saw Next's raw
   * English "Application error" — with the single-use OAuth code already
   * spent, so the link could not even be retried.
   *
   * Deleting safeGetMe's catch used to leave every test green.
   */
  it('returns null instead of throwing when the API is unreachable', async () => {
    mockSession('token-abc');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

    await expect(safeGetMe()).resolves.toBeNull();
  });

  it('returns null instead of throwing when the API rejects the token', async () => {
    mockSession('token-abc');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ code: 'AUTH_REQUIRED', message: 'Bạn cần đăng nhập.', correlationId: 'c-2' }),
        { status: 401 },
      ),
    );

    await expect(safeGetMe()).resolves.toBeNull();
  });

  it('returns null rather than a half-valid object when the response fails the contract', async () => {
    mockSession('token-abc');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }),
    );

    await expect(safeGetMe()).resolves.toBeNull();
  });

  it('returns the parsed profile on success', async () => {
    mockSession('token-abc');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(VALID_ME), { status: 200 }),
    );

    await expect(safeGetMe()).resolves.toMatchObject({ id: 'user-1' });
  });

  it('exports ApiProblemError so callers can branch on the problem code', () => {
    expect(new ApiProblemError({ code: 'X', message: 'y', correlationId: 'z' })).toBeInstanceOf(Error);
  });
});
