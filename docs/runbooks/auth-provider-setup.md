# Auth provider setup runbook

How to configure the Supabase project that backs ReGive's sign-in flow
(Google and Facebook OAuth only), and how that configuration maps to
this repo's environment variables. Companion doc:
[`local-development.md`](./local-development.md) covers the rest of the
local stack (Postgres, Redis, running the apps and tests).

All values below are examples — never commit a real anon key, service-role
key, or OAuth client secret. Only
`apps/api/.env.example` and `apps/web/.env.example` (placeholder values) are
checked into git; real values live in untracked `.env` / `.env.local` files.

## 1. Create or open a Supabase project

Use one Supabase project per environment (e.g. one for local/dev, one for
staging, one for production) so redirect URLs and provider credentials
don't leak across environments. From the project's dashboard you'll need,
under **Project Settings → API**:

- **Project URL** → `SUPABASE_URL` (API) and `NEXT_PUBLIC_SUPABASE_URL`
  (web). Example: `https://abcdefghijklmnop.supabase.co`.
- **anon public key** → `SUPABASE_ANON_KEY` (API) and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (web).
- **service_role secret key** — not needed. The API verifies JWTs against
  the public JWKS and holds no privileged Supabase credential. It was
  required only by the phone/OTP sign-in path, which has been removed. Do
  not put a service_role key in any environment for this project.

Derive `SUPABASE_JWKS_URL` from the project URL:

```
{SUPABASE_URL}/auth/v1/.well-known/jwks.json
```

Example: `https://abcdefghijklmnop.supabase.co/auth/v1/.well-known/jwks.json`.
This is what `apps/api/src/modules/identity/supabase-identity.verifier.ts`
fetches to cryptographically verify incoming JWTs.

## 2. Configure the redirect URL

The web app's OAuth callback route is
`apps/web/src/app/auth/callback/route.ts`, mounted at `/auth/callback`. Both
Google and Facebook sign-in (`apps/web/src/features/auth/auth-actions.ts`)
request this exact path as `redirectTo`, so Supabase must be told to allow
it.

In the Supabase dashboard, go to **Authentication → URL Configuration**:

- **Site URL**: your app's primary origin, e.g. `http://127.0.0.1:3000` for
  local dev, or your deployed origin for staging/production.
- **Redirect URLs**: add one entry per environment origin, each with
  `/auth/callback` appended:
  - Local dev: `http://127.0.0.1:3000/auth/callback`
  - Staging/production: `https://<your-domain>/auth/callback`

Without a matching entry here, `exchangeCodeForSession` in the callback
route fails and the user is redirected back to `/login?error=...`.

## 3. Enable the Google provider

**Authentication → Providers → Google**:

1. Create OAuth 2.0 credentials in
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (OAuth client ID, type "Web application").
2. Under **Authorized redirect URIs** in Google Cloud Console, add the
   **Supabase-hosted** callback URL shown on the Supabase provider config
   page — it looks like:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
   (This is Supabase's own callback, not the app's `/auth/callback` — that
   one is configured separately in step 2 above as a Supabase redirect
   URL, not a Google-side one.)
3. Copy the generated **Client ID** and **Client Secret** into the Supabase
   Google provider settings and toggle it **enabled**.

## 4. Enable the Facebook provider

**Authentication → Providers → Facebook**:

1. Create an app at [Facebook for Developers](https://developers.facebook.com/apps)
   with the **Facebook Login** product added.
2. Under Facebook Login → Settings, add the same Supabase-hosted callback
   URL (`https://<project-ref>.supabase.co/auth/v1/callback`) to **Valid
   OAuth Redirect URIs**.
3. Copy the app's **App ID** and **App Secret** into the Supabase Facebook
   provider settings and toggle it **enabled**.

## 5. Keep the phone provider disabled

**Authentication → Providers → Phone** must stay **off**.

ReGive has no phone sign-in: the OTP flow, the `/onboarding/phone` step and
every phone column were removed (migration
`20260906000000_drop_phone_verification`). Nothing in the app calls
`signInWithOtp`, so an enabled phone provider does nothing for users — but
Supabase's auth endpoint would still accept OTP requests from anyone, and
with a paid SMS gateway attached that is an open invitation to SMS-pumping
fraud billed to your account. Do not buy or connect an SMS gateway.

## 6. Wire the values into this repo

Once the project and providers are configured, populate the environment
files created from the `.env.example` templates (see
`local-development.md` step 4):

| Supabase value | `apps/api/.env` key | `apps/web/.env.local` key |
| --- | --- | --- |
| Project URL | `SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| Project URL + `/auth/v1/.well-known/jwks.json` | `SUPABASE_JWKS_URL` | — |
| anon public key | `SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role secret key | — (not used by this project) | — (never expose to web) |

`apps/web/.env.local` also needs `API_BASE_URL` pointing at the running API
(default `http://127.0.0.1:3001/v1` for local dev — see
`local-development.md` step 6). In production `API_BASE_URL` is required:
the web app throws rather than fall back to localhost.

Set `NEXT_PUBLIC_SITE_URL` to the deployed origin in production (e.g.
`https://<your-domain>`). When set it is always used for the OAuth
`redirectTo`; when unset (local dev, preview deploys) the origin comes from
the request's `Host` header. `x-forwarded-host` is never trusted — see
`resolveOrigin()` in `apps/web/src/features/auth/auth-actions.ts`.

## 7. Verify the flow

1. `corepack pnpm --filter api dev` and `corepack pnpm --filter web dev`
   (see `local-development.md`).
2. Visit `http://127.0.0.1:3000/login` — it should offer exactly two
   options: Google and Facebook.
3. Complete one OAuth provider sign-in; you should land on
   `/auth/callback`, then be redirected by `completeSignInRedirect()` to
   `/onboarding/profile` (first sign-in, no profile yet) or straight to
   `/trang-chu` (profile already complete).

`apps/web/e2e/onboarding.spec.ts` has two `test.fixme()` cases covering this
live-provider flow (a completed profile reaches `/trang-chu`, global
sign-out) — they stay skipped in CI because they need real OAuth infra plus
a running API and database, but are the tests to un-skip and run manually
(`RUN_E2E_LIVE_AUTH=true`) against a configured project like this one when
validating provider changes.
