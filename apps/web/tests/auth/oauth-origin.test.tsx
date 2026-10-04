import { headers } from 'next/headers';
import { signInWithGoogle } from '@/features/auth/auth-actions';
import { createClient } from '@/lib/supabase/server';

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/api/server-fetch', () => ({
  safeGetMe: vi.fn(),
}));

const headersMock = vi.mocked(headers);
const createClientMock = vi.mocked(createClient);
const signInWithOAuth = vi.fn();

function requestHeaders(values: Record<string, string>) {
  headersMock.mockResolvedValue(new Headers(values) as never);
}

async function redirectToSentToSupabase(): Promise<string> {
  await signInWithGoogle();
  return signInWithOAuth.mock.calls[0][0].options.redirectTo;
}

/**
 * The OAuth redirectTo used to be built from x-forwarded-host first. That
 * header is client-controlled wherever a proxy does not overwrite it, which
 * left Supabase's redirect allowlist as the only thing stopping the OAuth
 * code from being sent to another origin.
 */
describe('OAuth redirect origin', () => {
  beforeEach(() => {
    signInWithOAuth.mockReset().mockResolvedValue({
      data: { url: 'https://accounts.example.test/o/oauth2' },
      error: null,
    });
    createClientMock.mockResolvedValue({ auth: { signInWithOAuth } } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the configured site URL over anything the request claims', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://regive.example.test');
    requestHeaders({
      host: 'regive.example.test',
      'x-forwarded-host': 'attacker.example',
      'x-forwarded-proto': 'https',
    });

    await expect(redirectToSentToSupabase()).resolves.toBe(
      'https://regive.example.test/auth/callback',
    );
  });

  it('tolerates a trailing slash on the configured site URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://regive.example.test/');
    requestHeaders({ host: 'regive.example.test' });

    await expect(redirectToSentToSupabase()).resolves.toBe(
      'https://regive.example.test/auth/callback',
    );
  });

  it('never trusts x-forwarded-host, even without a configured site URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined);
    requestHeaders({
      host: '127.0.0.1:3000',
      'x-forwarded-host': 'attacker.example',
      'x-forwarded-proto': 'http',
    });

    await expect(redirectToSentToSupabase()).resolves.toBe(
      'http://127.0.0.1:3000/auth/callback',
    );
  });
});
