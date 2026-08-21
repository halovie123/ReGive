# Local development runbook

How to bring up ReGive's foundation (monorepo, database, cache, API, web) on a
fresh machine and run every layer of the test suite. Companion doc:
[`auth-provider-setup.md`](./auth-provider-setup.md) covers configuring the
Supabase project itself (redirect URLs, OAuth/phone providers).

## 1. Prerequisites

- Node.js `>=22.12 <23` (see the root `package.json` `engines` field).
- `corepack` enabled, which provides the pinned package manager:
  ```bash
  corepack enable
  corepack pnpm -v   # -> 11.20.0
  ```
  If your shell doesn't pick up a plain `pnpm` command after enabling
  corepack, prefix every command below with `corepack` (`corepack pnpm ...`).
- Docker Desktop (or another Docker Engine) for local Postgres and Redis.
- A Supabase project (hosted or local) — see `auth-provider-setup.md`.

## 2. Install dependencies

From the repo root:

```bash
pnpm install
```

## 3. Start Postgres and Redis

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts:

- `postgres:18-alpine` on `127.0.0.1:5432`, user/password/database all
  `regive` (i.e. `postgresql://regive:regive@127.0.0.1:5432/regive`).
- `redis:8-alpine` on `127.0.0.1:6379`.

Check status any time with:

```bash
docker compose -f infra/docker-compose.yml ps
```

The compose file only provisions the `regive` database automatically. CI
also runs the database-backed test suite against a second, isolated
database named `regive_identity_ci` (kept separate from `regive` so the
test suite can freely create/delete rows without touching your dev data).
Create it once per container lifetime:

```bash
docker compose -f infra/docker-compose.yml exec postgres \
  psql -U regive -d regive -c "CREATE DATABASE regive_identity_ci;"
```

(If the database already exists this errors harmlessly — safe to ignore.)

## 4. Configure environment files

Neither app ships a real `.env` — copy the example files and fill in your
own values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

- `apps/api/.env` — see the comments in `apps/api/.env.example` for each
  key. The `DATABASE_URL` and `REDIS_URL` defaults already match step 3
  above. `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_ANON_KEY`, and
  `SUPABASE_SERVICE_ROLE_KEY` come from your Supabase project (see
  `auth-provider-setup.md`). Generate a local `PII_ENCRYPTION_KEY_V1` with:
  ```bash
  openssl rand -base64 32
  ```
- `apps/web/.env.local` — see `apps/web/.env.example`. Needs
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the
  same Supabase project, plus `API_BASE_URL` (defaults to
  `http://127.0.0.1:3001/v1`, matching the API's default port below).

Never commit `.env`, `.env.local`, or any file containing a real
`SUPABASE_SERVICE_ROLE_KEY` — only the checked-in `.env.example` files
(placeholder values only) belong in git.

## 5. Apply database migrations

There is no separate seed script: the four service areas (`HOC_MON`,
`BA_DIEM`, `XUAN_THOI_SON`, `DONG_THANH`) are inserted by the migration SQL
itself (`apps/api/prisma/migrations/20260804000000_identity_foundation/migration.sql:49-57`),
so applying migrations is sufficient to get a usable dev database.

Apply migrations to your everyday dev database:

```bash
DATABASE_URL=postgresql://regive:regive@127.0.0.1:5432/regive \
  pnpm --filter api exec prisma migrate deploy
```

Apply the same migrations to the CI-mirror database (only needed if you
plan to run `test:e2e:db` locally, see step 7):

```bash
DATABASE_URL=postgresql://regive:regive@127.0.0.1:5432/regive_identity_ci \
  pnpm --filter api exec prisma migrate deploy
```

On Windows PowerShell, set the variable first instead of prefixing:

```powershell
$env:DATABASE_URL = 'postgresql://regive:regive@127.0.0.1:5432/regive'
pnpm --filter api exec prisma migrate deploy
```

Both migrations apply cleanly against a fresh `postgres:18-alpine`
container; run this again any time a new migration is added.

## 6. Run the apps

```bash
pnpm --filter api dev    # NestJS on http://127.0.0.1:3001, prefixed /v1
pnpm --filter web dev    # Next.js on http://127.0.0.1:3000
```

Sanity check: `curl http://127.0.0.1:3001/v1/health` should return
`{"status":"ok"}`.

## 7. Run the tests

| Command | What it covers | Needs Postgres/Redis? |
| --- | --- | --- |
| `pnpm test` | Every package's unit tests (root script fans out via `--recursive`) | No |
| `pnpm --filter api test:e2e` | All infra-free API e2e specs, including the release gate (`foundation-gate.e2e-spec.ts`) — these use in-memory fakes instead of a real database, so they run without Docker | No |
| `pnpm --filter api test:e2e:db` | The two database-backed e2e specs (`identity-db`, `profiles-db`) that verify real Postgres row-locking behavior | Yes — set `RUN_DATABASE_TESTS=true` and `TEST_DATABASE_URL` (see below) |
| `pnpm --filter web test:e2e` | Playwright public-routing tests (Playwright starts its own `next dev` server automatically) | No — 3 live-auth tests are intentionally `test.fixme()`'d, pending real OAuth/OTP infra |

Run the database-backed suite against the CI-mirror database created in
step 3/5:

```bash
RUN_DATABASE_TESTS=true \
TEST_DATABASE_URL=postgresql://regive:regive@127.0.0.1:5432/regive_identity_ci \
  pnpm --filter api test:e2e:db
```

On Windows PowerShell:

```powershell
$env:RUN_DATABASE_TESTS = 'true'
$env:TEST_DATABASE_URL = 'postgresql://regive:regive@127.0.0.1:5432/regive_identity_ci'
pnpm --filter api test:e2e:db
```

(`TEST_DATABASE_URL` must point at a database whose name contains `test`
or `ci` — this is enforced in code as a safety guard against accidentally
running destructive, lock-testing queries against a real dev/prod
database.)

## 8. Full verification (release gate)

Before opening a PR, run the same sequence CI runs end to end:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm --filter api test:e2e && pnpm --filter web test:e2e && pnpm build
```

All six must pass on a clean database. `pnpm test` (root) already fans out
to each package, which for `apps/api` includes its own e2e suite, and
`pnpm --filter api test:e2e` runs it again explicitly with the ability to
target just `foundation-gate` (`pnpm --filter api test:e2e -- foundation-gate`)
— both are part of the documented gate command above and safe to run more
than once.

## 9. Troubleshooting

- **`docker compose ... ps` shows nothing running**: Docker Desktop may
  have idled down — start it, then re-run `docker compose -f
  infra/docker-compose.yml up -d`.
- **API fails to start with a Zod validation error**: check
  `apps/api/src/common/config/env.schema.ts` — every listed variable is
  required, `DATABASE_URL`/`REDIS_URL` must use the right protocol, and
  `SUPABASE_URL`/`SUPABASE_JWKS_URL` must be `https://` unless
  `ALLOW_INSECURE_SUPABASE_HTTP=true` and `NODE_ENV` is not `production`.
- **`PII_ENCRYPTION_KEY_V1 must be base64 for exactly 32 bytes`**:
  regenerate with `openssl rand -base64 32` — the value must decode to
  exactly 32 bytes and round-trip back to the same base64 string.
- **`pnpm: command not found`**: run `corepack enable` once, or prefix
  commands with `corepack pnpm` instead of `pnpm`.
