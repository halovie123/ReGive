# Moderation, Admin and Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện báo cáo–kiểm duyệt–kháng nghị, dashboard quản trị, hardening bảo mật, observability, backup và closed-beta release gate.

**Architecture:** Moderation case gom target, evidence, actions và appeal; admin RBAC tách khỏi community role. Audit log append-only cho mọi hành động nhạy cảm. Production chạy container qua CDN/WAF, managed PostgreSQL/Redis/storage; CI tạo artifact bất biến và deploy staging trước production.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Redis/BullMQ, Next.js, OpenTelemetry, Sentry-compatible error tracking, Docker, GitHub Actions, Playwright, axe-core, k6.

## Global Constraints

- Admin roles: `SUPPORT`, `MODERATOR`, `ADMINISTRATOR`, `AUDITOR`; không dùng community role thay admin role.
- Không khóa vĩnh viễn chỉ bằng thuật toán; hành động nghiêm trọng cần con người và lý do.
- Admin chỉ xem chat evidence đã report/case-authorized; mọi lần mở evidence được audit.
- MEDIUM listing chỉ chủ bài thấy khi `PENDING_REVIEW`; HIGH bị `MODERATION_HIDDEN`.
- Closed beta: backup mã hóa hằng ngày giữ ≥7 ngày; public beta: PITR ≥7 ngày.
- Không log bí mật/PII; production không dùng service-role key ở frontend.
- Release phải qua lint, typecheck, unit, integration, E2E, accessibility, migration và restore drill.

---

### Task 1: Reports, moderation cases, actions and appeals

**Files:**
- Create: `packages/contracts/src/moderation.ts`
- Modify: `packages/contracts/src/enums.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_moderation/migration.sql`
- Create: `apps/api/src/modules/moderation/moderation-policy.ts`
- Create: `apps/api/src/modules/moderation/moderation.service.ts`
- Create: `apps/api/src/modules/moderation/moderation.controller.ts`
- Create: `apps/api/src/modules/moderation/moderation.module.ts`
- Test: `apps/api/src/modules/moderation/moderation.service.spec.ts`
- Test: `apps/api/test/moderation.e2e-spec.ts`

**Interfaces:**
- Consumes: user/listing/transaction/review/message targets.
- Produces: `POST /v1/reports`; `GET /v1/admin/cases`; `POST /v1/admin/cases/:id/actions`; `POST /v1/cases/:id/appeals`.

- [ ] **Step 1: Write case creation/severity/action tests**

```ts
expect(classifyReport('SAFETY_THREAT')).toBe('CRITICAL');
expect(classifyReport('WRONG_CATEGORY')).toBe('LOW');
await expect(service.permanentBan(algorithmActor, caseId)).rejects.toMatchObject({ code: 'HUMAN_DECISION_REQUIRED' });
```

Assert one reporter cannot inflate priority via duplicates and appeal belongs to affected user.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test -- moderation && pnpm --filter api test:e2e -- moderation`

Expected: FAIL because case/action/appeal models are absent.

- [ ] **Step 3: Implement case/evidence/action models**

Create `Report`, `ModerationCase`, `CaseEvidence`, `ModerationAction`, `Appeal`, `UserRiskSignal` and `UserRiskProjection`. Use polymorphic target type+ID validated against an allowlist. CRITICAL auto-hides content temporarily and creates priority case; permanent ban requires `MODERATOR` or `ADMINISTRATOR` actor and nonempty reason. Internal 90-day rolling risk weights are `RATE_LIMIT_BREACH +5` (cap 20), `DUPLICATE_CONTENT +10`, `VERIFIED_REPORT +20`, `PAYMENT_REQUEST +30`; score ≥50 prioritizes review and score ≥80 may temporarily restrict new activity, but never permanently acts without a human. Risk is visible only to staff. Append reputation event only after confirmed violation.

- [ ] **Step 4: Migrate and verify policy matrix**

Run: `pnpm --filter api prisma migrate dev --name moderation && pnpm --filter api test -- moderation && pnpm --filter api test:e2e -- moderation`

Expected: PASS for every role/action pair and duplicate-report rule.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts apps/api/prisma apps/api/src/modules/moderation apps/api/test/moderation.e2e-spec.ts
git commit -m "feat: add moderation cases actions and appeals"
```

### Task 2: Admin RBAC, protected evidence and append-only audit

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_admin_audit/migration.sql`
- Create: `apps/api/src/modules/admin/admin-role.guard.ts`
- Create: `apps/api/src/modules/admin/audit.service.ts`
- Create: `apps/api/src/modules/admin/evidence.service.ts`
- Create: `apps/api/src/modules/admin/admin.module.ts`
- Create: `apps/api/src/modules/admin/admin.controller.ts`
- Test: `apps/api/src/modules/admin/admin-role.guard.spec.ts`
- Test: `apps/api/test/admin-audit.e2e-spec.ts`

**Interfaces:**
- Consumes: moderation cases and authenticated staff identity.
- Produces: `GET /v1/admin/cases/:id/evidence`; `GET /v1/admin/audit`; `AuditService.append(actor,action,target,reason,metadata)`.

- [ ] **Step 1: Write RBAC/evidence/audit tests**

Assert SUPPORT cannot ban/view unrelated chat; MODERATOR can view reported excerpt only; AUDITOR can read audit but mutate nothing; ADMINISTRATOR can assign roles; each sensitive read creates an audit row.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test -- admin-role && pnpm --filter api test:e2e -- admin-audit`

Expected: FAIL because staff/audit models are absent.

- [ ] **Step 3: Implement exact permission matrix**

Create `StaffRole(userId, role)` and `AuditLog(id, actorId, action, targetType, targetId, reason, metadataJson, correlationId, createdAt)`. Deny updates/deletes to audit table at service and database privilege level. Evidence service returns only reported message plus bounded context, never entire conversation by default.

- [ ] **Step 4: Run migration and authorization suite**

Run: `pnpm --filter api prisma migrate dev --name admin_audit && pnpm --filter api test -- admin && pnpm --filter api test:e2e -- admin-audit`

Expected: PASS; unauthorized sensitive read is denied and still security-logged without content.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma apps/api/src/modules/admin apps/api/test/admin-audit.e2e-spec.ts
git commit -m "feat: enforce admin rbac and immutable audit"
```

### Task 3: Admin dashboard, moderation queue and impact metrics

**Files:**
- Create: `packages/contracts/src/admin.ts`
- Create: `apps/api/src/modules/analytics/analytics.repository.ts`
- Create: `apps/api/src/modules/analytics/analytics.controller.ts`
- Create: `apps/api/src/modules/analytics/analytics.module.ts`
- Create: `apps/api/src/modules/content/content.service.ts`
- Create: `apps/api/src/modules/content/content.controller.ts`
- Create: `apps/api/src/modules/content/content.module.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_content_reputation_policy/migration.sql`
- Modify: `apps/api/src/modules/reputation/reputation.worker.ts`
- Create: `apps/web/src/app/(admin)/admin/layout.tsx`
- Create: `apps/web/src/app/(admin)/admin/page.tsx`
- Create: `apps/web/src/app/(admin)/admin/kiem-duyet/page.tsx`
- Create: `apps/web/src/app/(admin)/admin/kiem-duyet/[id]/page.tsx`
- Create: `apps/web/src/app/(admin)/admin/noi-dung/page.tsx`
- Create: `apps/web/src/app/(admin)/admin/cau-hinh-uy-tin/page.tsx`
- Modify: `apps/web/src/app/cach-hoat-dong/page.tsx`
- Modify: `apps/web/src/app/nguyen-tac-cong-dong/page.tsx`
- Modify: `apps/web/src/app/an-toan/page.tsx`
- Modify: `apps/web/src/app/dieu-khoan/page.tsx`
- Modify: `apps/web/src/app/quyen-rieng-tu/page.tsx`
- Modify: `apps/web/src/app/tro-giup/page.tsx`
- Create: `apps/web/src/features/admin/case-queue.tsx`
- Create: `apps/web/src/features/admin/case-detail.tsx`
- Create: `apps/web/src/features/admin/kpi-cards.tsx`
- Test: `apps/api/test/analytics.e2e-spec.ts`
- Test: `apps/web/tests/admin/admin.test.tsx`
- Test: `apps/web/e2e/admin-moderation.spec.ts`

**Interfaces:**
- Consumes: cases/audit and domain aggregates.
- Produces: `GET /v1/admin/metrics/overview`; `GET/PATCH /v1/admin/content/:slug`; `POST /v1/admin/reputation-policy-versions`; admin queue/detail/dashboard/content/policy UI.

- [ ] **Step 1: Write metric and UI permission tests**

Seed known data and assert `completedGifts`, `completionRate`, median time, cancellation/no-show, active users, completed deliveries and open cases. Assert non-staff `/admin` returns 404/forbidden and no admin navigation leaks. Assert content updates create a version/audit row and reputation policy changes create a new immutable version instead of editing past rules.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test:e2e -- analytics && pnpm --filter web test -- admin && pnpm --filter web test:e2e -- admin-moderation`

Expected: FAIL because analytics/admin UI are absent.

- [ ] **Step 3: Implement query layer and dashboard**

Use explicit SQL/Prisma aggregations with Asia/Bangkok reporting boundaries and no PII. Build desktop-first dashboard; queue filters severity/status/age; case detail groups target, evidence, history, appeal and allowed actions with mandatory reason. Add versioned `ContentPage` records for public policy/help copy and `ReputationPolicyVersion` records with effective time, weights and author; activation is audited and projection rebuild runs as a background job. Public routes fetch the active content version server-side and fall back only to their reviewed baseline copy when the content service is unavailable.

- [ ] **Step 4: Run API/UI/E2E verification**

Run: `pnpm --filter api test:e2e -- analytics && pnpm --filter web test -- admin && pnpm --filter web test:e2e -- admin-moderation`

Expected: seeded values match exactly; moderator resolves a case and audit entry appears.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/admin.ts apps/api/src/modules/analytics apps/api/test/analytics.e2e-spec.ts apps/web/src/app apps/web/src/features/admin apps/web/tests/admin apps/web/e2e/admin-moderation.spec.ts
git commit -m "feat: add moderation console and impact dashboard"
```

### Task 4: Security hardening, privacy controls and retention jobs

**Files:**
- Create: `apps/api/src/common/security/rate-limit.module.ts`
- Modify: `apps/api/src/common/security/encryption.service.ts`
- Create: `apps/api/src/common/security/idempotency.interceptor.ts`
- Create: `apps/api/src/common/logging/redaction.ts`
- Create: `apps/api/src/modules/privacy/privacy.controller.ts`
- Create: `apps/api/src/modules/privacy/privacy.service.ts`
- Create: `apps/api/src/modules/privacy/retention.worker.ts`
- Create: `apps/api/src/modules/privacy/privacy.module.ts`
- Test: `apps/api/src/common/security/security.spec.ts`
- Test: `apps/api/test/privacy.e2e-spec.ts`
- Create: `docs/runbooks/security-incident.md`

**Interfaces:**
- Consumes: all API modules and personal data.
- Produces: distributed throttling, encrypted phone storage, idempotency, export/deletion request endpoints and retention worker.

- [ ] **Step 1: Write abuse/redaction/privacy tests**

Test login/message/listing rate buckets (bucket OTP đã bỏ cùng phone auth); same idempotency key+payload replays, same key+different payload rejects; logger redacts `authorization`, `phone`, `message.body` (người dùng vẫn có thể tự gõ số điện thoại vào chat/listing nên vẫn phải redact); deletion request preserves required audit while anonymizing public profile after review period.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test -- security && pnpm --filter api test:e2e -- privacy`

Expected: FAIL because global controls are absent.

- [ ] **Step 3: Implement global hardening**

Install `pnpm --filter api add @nestjs/throttler helmet` and use the existing Redis client for distributed storage.

Use Redis-backed throttler with initial limits: login 20/15 minutes/IP; new-account listings 10/day; new-account receive requests 20/day; chat 30/minute and 300/hour. Phone encryption: các cột `encrypted_phone`/`phone_last4`/`phone_verified_at` còn trong schema nhưng rỗng sau khi gỡ phone auth (2026-09-06) — quyết định xóa cột hay giữ TRƯỚC khi làm task này, và chỉ xây key rotation/re-encryption nếu quyết định giữ. Add request body hash with idempotency record and structured logger allowlist. Add CSP, HSTS, frame denial, strict CORS, signed upload restrictions and CSRF protection for same-origin mutations.

- [ ] **Step 4: Implement privacy workflow and verify**

Add authenticated export request and deletion request states, operator approval, data package job and retention cleanup. Initial retention: abandoned uploads 24 hours, abandoned drafts 30 days, read notifications 90 days, chat 24 months after the related transaction closes, and account/transaction/audit facts 24 months after account closure unless an active legal/safety hold applies. Do not hard-delete required transaction/audit facts; replace display identity with anonymized subject according to documented policy. Run security/privacy tests and dependency audit.

Expected: tests pass; secrets/PII do not appear in captured logs.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common apps/api/src/modules/privacy apps/api/test/privacy.e2e-spec.ts docs/runbooks/security-incident.md
git commit -m "feat: harden api and add privacy workflows"
```

### Task 5: Observability, containers, migrations and backup/restore

**Files:**
- Create: `apps/api/src/common/observability/observability.module.ts`
- Create: `apps/api/src/common/observability/request-context.middleware.ts`
- Create: `infra/docker/api.Dockerfile`
- Create: `infra/docker/web.Dockerfile`
- Create: `infra/docker-compose.production.yml`
- Create: `.github/workflows/deploy-staging.yml`
- Create: `.github/workflows/deploy-production.yml`
- Create: `scripts/check-migrations.ps1`
- Create: `scripts/backup-postgres.ps1`
- Create: `scripts/restore-postgres.ps1`
- Create: `docs/runbooks/deployment.md`
- Create: `docs/runbooks/backup-restore.md`
- Test: `apps/api/test/observability.e2e-spec.ts`

**Interfaces:**
- Consumes: complete application.
- Produces: immutable containers, trace/correlation propagation, safe migration gate, backup/restore commands.

- [ ] **Step 1: Write health/trace/container checks**

Assert `/v1/health/live` does not touch dependencies, `/ready` checks PostgreSQL/Redis, response echoes safe correlation ID, error event excludes PII. Container health checks run as non-root.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test:e2e -- observability && docker compose -f infra/docker-compose.production.yml config`

Expected: FAIL because observability/container files are absent.

- [ ] **Step 3: Implement telemetry and deployment pipeline**

Install `pnpm --filter api add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http`.

Add OpenTelemetry HTTP/Prisma/Redis spans, structured metrics and error tracking adapter. Build multi-stage non-root containers. Staging deploy runs migrate deploy, smoke test and rollback on failure; production requires manual environment approval and promotes the same image digest.

- [ ] **Step 4: Implement and exercise backup/restore**

Scripts require explicit database URL/output path, create encrypted custom-format dump plus checksum, and restore only into an explicitly named empty target database. Execute against local disposable database, compare row counts/checksum and record evidence in runbook.

Run: `pnpm test && docker compose -f infra/docker-compose.production.yml build && powershell -File scripts/check-migrations.ps1`.

Expected: PASS; restore drill reconstructs seeded data.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/observability infra .github/workflows scripts docs/runbooks apps/api/test/observability.e2e-spec.ts
git commit -m "chore: add observable production deployment and recovery"
```

### Task 6: Closed-beta quality gate

**Files:**
- Create: `apps/web/e2e/closed-beta.spec.ts`
- Create: `tests/accessibility/critical-pages.spec.ts`
- Create: `tests/load/discovery-chat.js`
- Create: `tests/security/authorization-matrix.spec.ts`
- Create: `docs/runbooks/closed-beta-checklist.md`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: all five plans.
- Produces: evidence-backed closed-beta decision.

- [ ] **Step 1: Add full journey and authorization tests**

Playwright uses donor, recipient, volunteer, moderator and stranger contexts: onboarding → publish → discover → request → select → chat → delivery → dual confirm → reviews → report → moderation/appeal. Authorization matrix probes every protected API with each actor.

- [ ] **Step 2: Add accessibility and load thresholds**

Install `pnpm --filter web add -D @axe-core/playwright` and keep k6 as an external CI binary pinned in the workflow image.

Run axe on login, onboarding, discovery, listing detail, create, activity, chat, volunteer, profile and admin case. k6 scenario targets authenticated discovery and chat history at expected pilot load; thresholds: API p95 <500 ms, error rate <1%, no duplicate messages/transactions.

- [ ] **Step 3: Run complete clean-environment verification**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter api test:e2e
pnpm --filter web test:e2e
pnpm build
```

Then run accessibility, authorization, k6, migration-from-empty and backup/restore suites. Expected: all thresholds pass with no critical/high issue.

- [ ] **Step 4: Complete operational checklist**

Verify provider redirects, WAF/rate limits, alert routing, moderator accounts, community rules, safety guide, privacy/terms legal review, support hours, incident contacts, backup evidence and rollback drill. Each item requires owner, timestamp and evidence link; unchecked item blocks launch.

- [ ] **Step 5: Commit the release gate**

```bash
git add apps/web/e2e/closed-beta.spec.ts tests docs/runbooks/closed-beta-checklist.md .github/workflows/ci.yml
git commit -m "test: enforce closed beta quality gate"
```
