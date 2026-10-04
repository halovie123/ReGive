# Foundation and Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> ## ⚠️ PLAN NÀY ĐÃ HOÀN THÀNH — MỘT PHẦN ĐÃ BỊ THAY THẾ (2026-09-06)
>
> Giữ nguyên làm hồ sơ của những gì đã xây. **Không dùng làm khuôn mẫu cho code mới.**
> Ba điểm dưới đây khác với hệ thống đang chạy:
>
> 1. **Đăng nhập bằng số điện thoại và OTP đã bị gỡ bỏ** (SMS gateway tính phí).
>    Chỉ còn Google và Facebook OAuth. **Tuyệt đối không gắn
>    `VerifiedPhoneGuard` vào endpoint mới** — không tài khoản nào có
>    `phoneVerifiedAt`, nên mọi người sẽ nhận 403 `PHONE_NOT_VERIFIED` vĩnh
>    viễn, trong khi unit test vẫn xanh vì test tự set `phoneVerified: true`.
> 2. **`AREA_CODES` giờ là 22 quận/huyện TP.HCM**, không phải 4 xã Hóc Môn.
>    Nguồn đúng: `packages/contracts/src/enums.ts`.
> 3. **PostgreSQL 17** (Supabase production 17.6), không phải 18.
>
> Chi tiết ở mục "Amendments after Plan 1 shipped" trong
> [roadmap](./2026-08-04-buy-nothing-mvp-roadmap.md).

**Goal:** Tạo monorepo chạy được với web/API/database, đăng nhập Google–Facebook (bản gốc còn có phone + OTP, đã gỡ bỏ), hồ sơ đa vai trò và các khu vực phục vụ.

**Architecture:** Next.js làm same-origin web/BFF và NestJS cung cấp `/v1`. Supabase quản lý identity; API xác minh JWT qua JWKS rồi ánh xạ `sub` sang user nội bộ. Prisma quản lý PostgreSQL; contract Zod dùng chung giữ request/response đồng nhất.

**Tech Stack:** Node.js 22 LTS (`>=22.12 <23`), pnpm 11, TypeScript, Next.js 16, NestJS 11, Prisma 7, PostgreSQL 17, Supabase SSR/Auth, Zod, Jest, Vitest, Playwright.

## Global Constraints

- Dùng exact enum/copy trong roadmap; không thêm vai trò/khu vực ngoài MVP.
- Brand ReGive lấy từ logo đã duyệt: lime `#A8D67A`, mint `#9FD3C7`, green text/action `#6FAF68`, ink `#24372B`, warm white `#FBFCF8`; đường cong mềm, nhiều khoảng trắng, không dùng xanh đậm nặng tính hành chính.
- Tạo `BrandLockup` dạng code-native gồm chữ `ReGive` và tagline `Giving Sharing Sustaining`; giữ interface để thay bằng SVG/PNG nền trong mà không đổi layout khi asset gốc được cung cấp.
- ~~JWT authentication được phép vào endpoint đồng bộ OTP/onboarding; `VerifiedPhoneGuard` chặn toàn bộ nghiệp vụ cộng đồng cho tới khi local `phoneVerifiedAt` được xác nhận từ Supabase Admin API.~~ **SUPERSEDED 2026-09-06:** JWT hợp lệ là đủ để vào nghiệp vụ cộng đồng. `VerifiedPhoneGuard` không còn được gắn vào route nào và không được gắn thêm.
- Session web dùng Supabase SSR cookie; web BFF truyền bearer token tới API, browser không lưu token trong localStorage.
- API lỗi theo `{ code, message, correlationId, details? }`.
- Tất cả migration có test và tên rõ nghĩa; không dùng `prisma db push` ngoài thử nghiệm cục bộ.

---

### Task 1: Bootstrap monorepo, local infrastructure and CI baseline

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.nvmrc`
- Create: `.editorconfig`
- Create: `.gitignore`
- Create: `infra/docker-compose.yml`
- Create: `apps/api/*` via Nest scaffold
- Create: `apps/web/*` via Next scaffold
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.setup.ts`
- Create: `apps/web/playwright.config.ts`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/vitest.config.ts`
- Create: `.github/workflows/ci.yml`
- Test: `apps/api/test/health.e2e-spec.ts`
- Test: `apps/web/tests/smoke/home.test.tsx`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/input.tsx`
- Create: `apps/web/src/components/ui/select.tsx`
- Create: `apps/web/src/components/ui/dialog.tsx`
- Create: `apps/web/src/components/ui/status-state.tsx`
- Create: `apps/web/src/components/brand/brand-lockup.tsx`
- Test: `apps/web/tests/brand/brand-lockup.test.tsx`

**Interfaces:**
- Consumes: none.
- Produces: root scripts `dev`, `lint`, `typecheck`, `test`, `build`; HTTP `GET /v1/health -> {status:'ok'}`.

- [ ] **Step 1: Scaffold workspace and pin supported runtime**

Run:

```powershell
corepack use pnpm@latest-11
pnpm dlx @nestjs/cli@11 new apps/api --package-manager pnpm --skip-git
pnpm create next-app@16 apps/web --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
pnpm --filter web add -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
```

Create root `package.json` with `private: true`, `engines.node: ">=22.12 <23"` and scripts `lint`, `typecheck`, `test`, `build` calling `pnpm --recursive --if-present`. Add `.nvmrc` containing `22`. Set `packages/contracts/package.json` to name `@buy-nothing/contracts`, `type: module`, exports `./src/index.ts`, scripts `test: vitest run`, `typecheck: tsc --noEmit`, and dependency `zod`; its `tsconfig.json` enables strict TypeScript and no emit. Add web scripts `test: vitest run`, `test:e2e: playwright test`, `typecheck: tsc --noEmit`; configure Vitest for jsdom/setup and Playwright base URL `http://127.0.0.1:3000`.

- [ ] **Step 2: Add PostgreSQL/Redis local services and failing health tests**

Use `postgres:18-alpine` and `redis:8-alpine` with named volumes and health checks. Add API test:

```ts
it('GET /v1/health', () =>
  request(app.getHttpServer())
    .get('/v1/health')
    .expect(200)
    .expect({ status: 'ok' }));
```

Add web smoke test expecting the public heading `Chia sẻ món đồ cũ, trao thêm một niềm vui`.

- [ ] **Step 3: Run tests and verify red state**

Run: `pnpm test`

Expected: API fails because `/v1/health` is absent; web fails because landing content is absent.

- [ ] **Step 4: Implement health route, public landing shell and CI**

Set Nest global prefix `v1`; implement `HealthController`. Add root layout with `lang="vi"`, Be Vietnam Pro and the exact ReGive tokens from Global Constraints. Implement `BrandLockup`, accessible Button/Input/Select/Dialog and shared loading-empty-error states with visible focus, keyboard behavior and reduced-motion styles. CI runs install with frozen lockfile, lint, typecheck, tests and build against PostgreSQL/Redis services.

- [ ] **Step 5: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Expected: all pass.

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml .nvmrc .editorconfig .gitignore infra apps packages .github
git commit -m "chore: bootstrap web api and local infrastructure"
```

### Task 2: Shared contracts, configuration and error boundary

**Files:**
- Create: `packages/contracts/src/enums.ts`
- Create: `packages/contracts/src/errors.ts`
- Create: `packages/contracts/src/identity.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/contracts.test.ts`
- Create: `apps/api/src/common/config/env.schema.ts`
- Create: `apps/api/src/common/http/api-exception.filter.ts`
- Modify: `apps/api/src/main.ts`
- Create: `apps/web/src/lib/api/problem.ts`

**Interfaces:**
- Consumes: root workspace from Task 1.
- Produces: `UserRole`, `AreaCode`, `ApiProblem`, `IdentityClaims`, `envSchema`.

- [ ] **Step 1: Write contract tests**

```ts
expect(UserRoleSchema.parse('DONOR')).toBe('DONOR');
expect(() => AreaCodeSchema.parse('DISTRICT_1')).toThrow();
expect(ApiProblemSchema.parse({
  code: 'AUTH_REQUIRED', message: 'Bạn cần đăng nhập', correlationId: 'c-1'
}).code).toBe('AUTH_REQUIRED');
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm --filter @buy-nothing/contracts test`

Expected: FAIL because schemas are not exported.

- [ ] **Step 3: Implement exact shared types**

Run `pnpm --filter @buy-nothing/contracts add zod && pnpm --filter @buy-nothing/contracts add -D vitest typescript && pnpm --filter api add @nestjs/config zod` before adding the schemas.

```ts
export const USER_ROLES = ['DONOR', 'RECIPIENT', 'VOLUNTEER'] as const;
// SUPERSEDED 2026-09-06 — giá trị thật là 22 quận/huyện TP.HCM.
// Nguồn đúng: packages/contracts/src/enums.ts. Không copy dòng dưới.
export const AREA_CODES = ['HOC_MON', 'BA_DIEM', 'XUAN_THOI_SON', 'DONG_THANH'] as const;
export const UserRoleSchema = z.enum(USER_ROLES);
export const AreaCodeSchema = z.enum(AREA_CODES);
export type IdentityClaims = { subject: string; sessionId: string };
export type ApiProblem = { code: string; message: string; correlationId: string; details?: unknown };
```

Validate `DATABASE_URL`, `REDIS_URL`, `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PII_ENCRYPTION_KEY_V1`. Implement a global exception filter that emits `ApiProblem` without stack traces.

- [ ] **Step 4: Run contract/API tests**

Run: `pnpm --filter @buy-nothing/contracts test && pnpm --filter api test`

Expected: PASS; malformed environment test exits with validation error naming the missing key.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts apps/api/src/common apps/api/src/main.ts apps/web/src/lib/api
git commit -m "feat: add shared contracts and api problem format"
```

### Task 3: Prisma identity model and Supabase JWT verification

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma.config.ts`
- Create: `apps/api/prisma/migrations/*_identity_foundation/migration.sql`
- Create: `apps/api/src/common/prisma/prisma.module.ts`
- Create: `apps/api/src/common/prisma/prisma.service.ts`
- Create: `apps/api/src/modules/identity/identity-verifier.ts`
- Create: `apps/api/src/modules/identity/supabase-identity.verifier.ts`
- Create: `apps/api/src/modules/identity/supabase-user-admin.ts`
- Create: `apps/api/src/modules/identity/jwt-auth.guard.ts`
- Create: `apps/api/src/modules/identity/verified-phone.guard.ts`
- Create: `apps/api/src/modules/identity/identity.controller.ts`
- Create: `apps/api/src/modules/identity/current-user.decorator.ts`
- Create: `apps/api/src/common/security/encryption.service.ts`
- Test: `apps/api/src/modules/identity/verified-phone.guard.spec.ts`
- Test: `apps/api/test/identity.e2e-spec.ts`

**Interfaces:**
- Consumes: `IdentityClaims`, environment keys from Task 2.
- Produces: `IdentityVerifier.verify(token): Promise<IdentityClaims>`; `JwtAuthGuard`; `VerifiedPhoneGuard`; `POST /v1/identity/sync-phone`; request property `currentUser: {id:string; providerSubject:string; phoneVerified:boolean}`.

- [ ] **Step 1: Write failing guard and provisioning tests**

```ts
it('rejects community access when local phone verification is absent', async () => {
  request.currentUser = { id: 'u-1', providerSubject: 'sub-1', phoneVerified: false };
  await expect(guard.canActivate(context)).rejects.toMatchObject({ response: { code: 'PHONE_NOT_VERIFIED' } });
});

it('provisions exactly one local user for repeated requests with the same sub', async () => {
  await callMe('token-sub-1');
  await callMe('token-sub-1');
  expect(await prisma.user.count()).toBe(1);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter api test -- verified-phone.guard && pnpm --filter api test:e2e -- identity`

Expected: FAIL because verifier, schema and guard do not exist.

- [ ] **Step 3: Implement schema, migration and verifier**

Install runtime/tooling: `pnpm --filter api add @prisma/client @prisma/adapter-pg pg jose && pnpm --filter api add -D prisma @types/pg`.

Create `User(id, providerSubject unique, encryptedPhone, phoneLast4, phoneVerifiedAt, phoneEncryptionKeyVersion, status, activeRole, createdAt, updatedAt)`, `UserRole(userId, role)` and `Area(code unique, nameVi, active)`. `JwtAuthGuard` verifies Supabase JWT signature/issuer/audience through remote JWKS using `jose` and upserts by subject, but does not infer phone verification from JWT claims. `POST /v1/identity/sync-phone` calls a server-only Supabase Admin adapter for that subject, requires non-null `phone_confirmed_at`, encrypts the normalized phone with AES-256-GCM, stores last four digits and sets `phoneVerifiedAt`. `VerifiedPhoneGuard` protects community modules but not sync/onboarding endpoints.

- [ ] **Step 4: Apply migration and run tests**

Run:

```bash
pnpm --filter api prisma migrate dev --name identity_foundation
pnpm --filter api test -- verified-phone.guard
pnpm --filter api test:e2e -- identity
```

Expected: migration succeeds; JWT-only access can call sync/onboarding but community access returns 403 `PHONE_NOT_VERIFIED`; successful sync unlocks it; repeated subject produces one user.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma apps/api/src/common apps/api/src/modules/identity apps/api/test/identity.e2e-spec.ts
git commit -m "feat: verify identity tokens and provision users"
```

### Task 4: Profile, roles, areas and onboarding API

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_profiles_roles_areas/migration.sql`
- Create: `packages/contracts/src/profile.ts`
- Create: `apps/api/src/modules/profiles/profiles.module.ts`
- Create: `apps/api/src/modules/profiles/profiles.controller.ts`
- Create: `apps/api/src/modules/profiles/profiles.service.ts`
- Test: `apps/api/src/modules/profiles/profiles.service.spec.ts`
- Test: `apps/api/test/profiles.e2e-spec.ts`

**Interfaces:**
- Consumes: authenticated `currentUser` from Task 3.
- Produces: `GET /v1/me`; `PUT /v1/me/profile`; `PUT /v1/me/roles`; `PUT /v1/me/active-role`; `PUT /v1/me/areas`.

- [ ] **Step 1: Define schemas and failing tests**

```ts
export const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(300).default(''),
});
export const UpdateRolesSchema = z.object({ roles: z.array(UserRoleSchema).min(1) });
export const UpdateAreasSchema = z.object({ areas: z.array(AreaCodeSchema).min(1).max(4) });
```

Test that active role must be one of the user's roles and unknown area is rejected.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test -- profiles && pnpm --filter api test:e2e -- profiles`

Expected: FAIL with missing controller/service.

- [ ] **Step 3: Implement profile model and endpoints**

Add `Profile(userId unique, displayName, bio, avatarKey)` and `UserArea(userId, areaCode)` with composite unique keys. Seed exactly four active areas. Make each update transactionally replace the relevant join rows and return the complete `MeResponse`.

- [ ] **Step 4: Run migration and tests**

Run: `pnpm --filter api prisma migrate dev --name profiles_roles_areas && pnpm --filter api test && pnpm --filter api test:e2e`

Expected: PASS; role/area validation returns Vietnamese API problems.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src apps/api/prisma apps/api/src/modules/profiles apps/api/test/profiles.e2e-spec.ts
git commit -m "feat: add profile role and area onboarding api"
```

### Task 5: Web authentication, OTP onboarding and protected app shell

> **SUPERSEDED 2026-09-06:** phần OTP và `/onboarding/phone` của task này đã bị gỡ bỏ. Luồng hiện tại: OAuth callback → `/onboarding/profile` → `/trang-chu` (xem `apps/web/src/lib/onboarding-step.ts`).

**Files:**
- Create: `apps/web/src/lib/supabase/client.ts`
- Create: `apps/web/src/lib/supabase/server.ts`
- Create: `apps/web/src/proxy.ts`
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/auth/callback/route.ts`
- Create: `apps/web/src/app/cach-hoat-dong/page.tsx`
- Create: `apps/web/src/app/nguyen-tac-cong-dong/page.tsx`
- Create: `apps/web/src/app/an-toan/page.tsx`
- Create: `apps/web/src/app/dieu-khoan/page.tsx`
- Create: `apps/web/src/app/quyen-rieng-tu/page.tsx`
- Create: `apps/web/src/app/tro-giup/page.tsx`
- Create: `apps/web/src/app/manifest.ts`
- Create: `apps/web/src/app/(onboarding)/onboarding/phone/page.tsx`
- Create: `apps/web/src/app/(onboarding)/onboarding/profile/page.tsx`
- Create: `apps/web/src/app/(app)/layout.tsx`
- Create: `apps/web/src/app/(app)/trang-chu/page.tsx`
- Create: `apps/web/src/app/(app)/bao-mat/page.tsx`
- Create: `apps/web/src/features/home/role-home.tsx`
- Create: `apps/web/src/features/auth/auth-actions.ts`
- Create: `apps/web/src/features/onboarding/onboarding-form.tsx`
- Test: `apps/web/tests/auth/login.test.tsx`
- Test: `apps/web/tests/onboarding/onboarding.test.tsx`
- Test: `apps/web/e2e/onboarding.spec.ts`

**Interfaces:**
- Consumes: Supabase identity and `/v1/me` profile endpoints.
- Produces: protected route policy and completed user onboarding.

- [ ] **Step 1: Write UI and redirect tests**

```ts
expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeVisible();
expect(screen.getByRole('button', { name: 'Tiếp tục với Facebook' })).toBeVisible();
expect(screen.getByLabelText('Số điện thoại')).toBeVisible();
```

Playwright test: public policy/help routes render without a session; unauthenticated `/kham-pha` redirects to `/login`; OAuth user without verified phone goes to `/onboarding/phone`; completed profile reaches `/trang-chu`; global sign-out revokes provider sessions and returns to landing.

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter web test -- auth onboarding && pnpm --filter web test:e2e -- onboarding`

Expected: FAIL because pages/proxy do not exist.

- [ ] **Step 3: Implement Supabase SSR flows**

Install `pnpm --filter web add @supabase/ssr @supabase/supabase-js react-hook-form @hookform/resolvers zod`.

Use server cookie utilities and OAuth callbacks for `google` and `facebook`. ~~phone `signInWithOtp`/`verifyOtp`, phone-change verification, then `POST /v1/identity/sync-phone` before profile endpoints~~ **SUPERSEDED 2026-09-06 — đã gỡ bỏ.** Implement BFF fetch helper that reads the server session and injects bearer token to API.

- [ ] **Step 4: Implement app shell and verify**

App shell includes logo, role switcher, notification/profile actions and mobile nav. `/trang-chu` renders role-specific primary CTA and empty activity summary without duplicating three separate apps. Add Vietnamese public policy/safety/help pages from the approved spec, a web app manifest, installable icons and account-security page with global sign-out. Run: `pnpm --filter web test && pnpm --filter web test:e2e && pnpm --filter web build`.

Expected: all pass; no token exists in localStorage; protected pages redirect correctly.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src apps/web/tests apps/web/e2e
git commit -m "feat: add oauth phone otp and onboarding experience"
```

### Task 6: Foundation release gate and runbook

**Files:**
- Create: `docs/runbooks/local-development.md`
- Create: `docs/runbooks/auth-provider-setup.md`
- Create: `apps/api/test/foundation-gate.e2e-spec.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: all Task 1–5 deliverables.
- Produces: repeatable setup and Plan 1 release gate.

- [ ] **Step 1: Add a failing release-gate test**

Test sequence: health → verified identity → update profile → add all three roles → select `VOLUNTEER` → set khu vực (ví dụ `HOC_MON`/`QUAN_12`; `BA_DIEM` đã bị gộp vào `HOC_MON` từ 2026-09-06) → fetch `/v1/me` and compare complete response.

- [ ] **Step 2: Run the gate**

Run: `pnpm --filter api test:e2e -- foundation-gate`

Expected: FAIL if any migration, seed, guard or response contract is incomplete.

- [ ] **Step 3: Document exact local/provider setup**

Document required Supabase redirect URLs (`/auth/callback`), enabled Google/Facebook providers (phone provider đã gỡ bỏ), `.env.example` keys, Docker startup, migrations, seed and test commands. Use example values only; never commit service-role secrets.

- [ ] **Step 4: Run full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter api test:e2e && pnpm --filter web test:e2e && pnpm build`

Expected: all pass on clean database.

- [ ] **Step 5: Commit**

```bash
git add docs/runbooks apps/api/test/foundation-gate.e2e-spec.ts .github/workflows/ci.yml
git commit -m "test: add foundation identity release gate"
```
