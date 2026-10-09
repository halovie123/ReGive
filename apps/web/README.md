# ReGive web (`apps/web`)

Next.js App Router front end for ReGive. Sign-in is Google/Facebook OAuth via
Supabase; the session lives in HttpOnly cookies and is forwarded server-side
to the API (`src/lib/api/server-fetch.ts`) — the access token never reaches
the browser.

Setup and environment variables:
[`docs/runbooks/local-development.md`](../../docs/runbooks/local-development.md)
and [`docs/runbooks/auth-provider-setup.md`](../../docs/runbooks/auth-provider-setup.md).

## Layout

| Path | What lives there |
| --- | --- |
| `src/app/(app)/` | Signed-in shell (`/trang-chu`, `/bao-mat`) with its own loading and error states |
| `src/app/(auth)/`, `src/app/auth/callback/` | Login page and OAuth callback |
| `src/app/(onboarding)/` | First-run profile, roles and areas |
| `src/app/*` (other folders) | Public pages: how it works, rules, safety, terms, privacy, help |
| `src/proxy.ts` | Session refresh and default-protected routing: anything not in `PUBLIC_PATHS` redirects to `/login` |
| `next.config.ts` | Security headers for every route |

## Commands

`pnpm` is often not on `PATH` on Windows machines; prefix with `corepack`.

```bash
corepack pnpm --filter web dev        # http://127.0.0.1:3000 (Turbopack)
corepack pnpm --filter web test       # Vitest
corepack pnpm --filter web test:e2e   # Playwright, starts its own dev server
corepack pnpm --filter web build
```

## Production environment

- `API_BASE_URL` is required — the app throws rather than fall back to
  localhost.
- `NEXT_PUBLIC_SITE_URL` should be the deployed origin; it is used for the
  OAuth redirect in preference to the request's `Host` header.
