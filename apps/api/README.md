# ReGive API (`apps/api`)

NestJS service behind the ReGive web app. It verifies Supabase-issued JWTs
against the project's public JWKS, provisions users on first request, and
owns profiles, roles and service areas. It holds no privileged Supabase
credential and stores no encrypted PII.

Setup, environment variables and the full test matrix live in
[`docs/runbooks/local-development.md`](../../docs/runbooks/local-development.md);
Supabase configuration in
[`docs/runbooks/auth-provider-setup.md`](../../docs/runbooks/auth-provider-setup.md).

## Routes

Every route is under the `/v1` prefix. Anything not listed here is a 404 by
design — there is no root endpoint.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/v1/health` | none | Liveness. Never touches the database, so a slow database cannot get the process restarted. |
| GET | `/v1/ready` | none | Readiness. Runs `SELECT 1`; 503 `NOT_READY` when the database is unreachable. |
| GET | `/v1/me` | bearer | Current user: profile, roles, active role, areas. |
| PUT | `/v1/me/profile` | bearer | Display name and bio. |
| PUT | `/v1/me/roles` | bearer | Roles held (`DONOR`, `RECIPIENT`, `VOLUNTEER`). |
| PUT | `/v1/me/active-role` | bearer | Which held role is active. |
| PUT | `/v1/me/areas` | bearer | Service areas (districts of Ho Chi Minh City). |

Errors use the shared `ApiProblem` envelope from `@buy-nothing/contracts`
(`code`, Vietnamese `message`, `correlationId`) and never carry driver or
stack details.

## Commands

`pnpm` is often not on `PATH` on Windows machines; prefix with `corepack`.

```bash
corepack pnpm --filter api dev          # watch mode, port 3001
corepack pnpm --filter api test         # unit + infra-free e2e
corepack pnpm --filter api test:e2e:db  # needs Postgres, see the runbook
corepack pnpm --filter api smoke        # build, boot dist/, call /v1/health
```

`smoke` is the only check that starts the compiled server for real — keep it
green. Unit and e2e suites passed once while `node dist/src/main.js` could
not start at all.

## Gotchas

- Do not import runtime values from `@buy-nothing/contracts` into code that
  unit tests load: contracts ships ESM from `dist/` and the Jest config cannot
  transform it. `import type` is fine.
- After editing `prisma/schema.prisma`, run `prisma generate` or typecheck
  fails with confusing enum errors.
- Postgres enums sort by declaration order, not alphabetically.
