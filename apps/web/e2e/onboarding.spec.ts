import { expect, test } from '@playwright/test';

/**
 * End-to-end coverage for the auth/onboarding flow described in Task 5.
 *
 * Two groups:
 *  - "public routing" — runs standalone against `next dev`, no Supabase
 *    project or API required. proxy.ts is designed to fail closed on
 *    protected routes and fail open on public routes even when Supabase
 *    isn't configured (see apps/web/src/proxy.ts), so these assertions are
 *    real, not stubbed.
 *  - "live auth flows" — needs a real Supabase project with Google and
 *    Facebook OAuth apps configured, plus the NestJS API and Postgres
 *    running so /v1/identity/sync-phone and /v1/me resolve. Gated behind
 *    RUN_E2E_LIVE_AUTH=true, mirroring the RUN_DATABASE_TESTS pattern used
 *    by the API's DB-backed e2e specs (apps/api/test/*-db.e2e-spec.ts).
 *    Not runnable in this sandbox: no live OAuth apps and no API/DB stack.
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

  test('login page offers Google, Facebook and phone number sign-in', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Tiếp tục với Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tiếp tục với Facebook' })).toBeVisible();
    await expect(page.getByLabel('Số điện thoại')).toBeVisible();
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
    await page.goto('/onboarding/phone');
    await expect(page).toHaveURL(/\/login$/);

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

test.describe('live auth flows', () => {
  test.skip(
    !RUN_LIVE_AUTH,
    'Requires a live Supabase project with Google/Facebook OAuth apps configured and a running API+DB stack. Set RUN_E2E_LIVE_AUTH=true once that infrastructure is available.',
  );

  test('an OAuth user without a verified phone lands on /onboarding/phone', async () => {
    test.fixme();
  });

  test('a completed profile reaches /trang-chu', async () => {
    test.fixme();
  });

  test('global sign-out revokes provider sessions and returns to the landing page', async () => {
    test.fixme();
  });
});
