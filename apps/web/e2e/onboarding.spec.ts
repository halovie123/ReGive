import { expect, test } from '@playwright/test';

/**
 * End-to-end coverage for the auth/onboarding flow described in Task 5.
 *
 * Sign-in is Google/Facebook OAuth only — phone/OTP sign-in and phone
 * verification were removed (no paid SMS gateway); see
 * lib/onboarding-step.ts.
 *
 * Two groups:
 *  - "public routing" — runs standalone against `next dev`, no Supabase
 *    project or API required. proxy.ts is designed to fail closed on
 *    protected routes and fail open on public routes even when Supabase
 *    isn't configured (see apps/web/src/proxy.ts), so these assertions are
 *    real, not stubbed.
 *  - "live auth flows" — needs a real Supabase project with Google and
 *    Facebook OAuth apps configured, plus the NestJS API and Postgres
 *    running so /v1/me resolves. Gated behind RUN_E2E_LIVE_AUTH=true,
 *    mirroring the RUN_DATABASE_TESTS pattern used by the API's DB-backed
 *    e2e specs (apps/api/test/*-db.e2e-spec.ts). Not runnable in this
 *    sandbox: no live OAuth apps and no API/DB stack.
 */

const PUBLIC_ROUTES = [
  '/',
  '/cach-hoat-dong',
  '/nguyen-tac-cong-dong',
  '/an-toan',
  '/dieu-khoan',
  '/quyen-rieng-tu',
  '/tro-giup',
  '/login',
];

test.describe('public routing', () => {
  for (const path of PUBLIC_ROUTES) {
    test(`renders ${path} without a session`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.ok()).toBeTruthy();
    });
  }

  test('login page offers Google and Facebook sign-in', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Tiếp tục với Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tiếp tục với Facebook' })).toBeVisible();
  });

  test('an unauthenticated visitor is redirected to /login from a protected route', async ({
    page,
  }) => {
    // /kham-pha doesn't exist yet (a later task), but proxy.ts protects
    // every route by default unless it's explicitly public, so this
    // redirect fires before Next.js would even 404 the route.
    await page.goto('/kham-pha');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('onboarding routes redirect an unauthenticated visitor to /login', async ({ page }) => {
    await page.goto('/onboarding/profile');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the app shell redirects an unauthenticated visitor to /login', async ({ page }) => {
    await page.goto('/trang-chu');
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/bao-mat');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('does not store a Supabase session token in localStorage', async ({ page }) => {
    await page.goto('/login');
    const localStorageKeys = await page.evaluate(() => Object.keys(window.localStorage));
    const hasSupabaseToken = localStorageKeys.some((key) => key.startsWith('sb-'));
    expect(hasSupabaseToken).toBe(false);
  });
});

const RUN_LIVE_AUTH = process.env.RUN_E2E_LIVE_AUTH === 'true';

/**
 * These two scenarios stay as fixme stubs deliberately, not just for lack
 * of a live Supabase project.
 *
 * The routing *decision* the first one exercises — "profile !== null ->
 * /trang-chu" — is now a single pure function, lib/onboarding-step.ts's
 * nextOnboardingStep(), used by every guard in the app (login page, the
 * onboarding page, the app shell layout, and completeSignInRedirect).
 * That function has exhaustive unit coverage of exactly this case in
 * tests/lib/onboarding-step.test.tsx — that is what regresses if this
 * logic ever drifts again, which is the actual failure mode Fix round 1
 * finding 7 was about.
 *
 * Turning this into a genuine browser-level Playwright test (as opposed
 * to that unit coverage) means getting a real signed-in session in front
 * of a running `next dev` server. We looked at faking it — cookie
 * @supabase/ssr will accept — and it is not a small mock: the session
 * cookie's value is base64url-encoded and gets *chunked* across multiple
 * cookies once the payload is large enough (see
 * @supabase/ssr/dist/module/utils/chunker.js), and `supabase.auth.getUser()`
 * (which proxy.ts and every guard call, deliberately, instead of the
 * cookie-only `getSession()`, so a stale/forged cookie can't grant access)
 * does not just decode that cookie — it makes a live revalidation request
 * to `${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`. A faithful fake would mean
 * standing up a small stand-in Supabase Auth + our own API server, wiring
 * their ports into the Playwright webServer's env, and keeping that in
 * sync with whatever GoTrueClient does next. That's real infrastructure,
 * not a quick mock, and it duplicates coverage the unit test already
 * gives more precisely and far more cheaply. So: left as fixme, same as
 * "global sign-out revokes provider sessions", which needs the same live
 * OAuth + API/DB stack for a different reason (there is no fake to build
 * here — it is inherently an integration behavior, revoking real
 * refresh tokens against a real Supabase project).
 */
test.describe('live auth flows', () => {
  test.skip(
    !RUN_LIVE_AUTH,
    'Requires a live Supabase project with Google/Facebook OAuth apps configured and a running API+DB stack. Set RUN_E2E_LIVE_AUTH=true once that infrastructure is available.',
  );

  test('a completed profile reaches /trang-chu', async () => {
    test.fixme();
  });

  test('global sign-out revokes provider sessions and returns to the landing page', async () => {
    test.fixme();
  });
});
