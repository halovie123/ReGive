# Volunteer Delivery, Reputation and Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung hỗ trợ vận chuyển tình nguyện, đánh giá sau giao dịch và điểm uy tín có thể giải thích/audit mà không kỳ thị người nhận.

**Architecture:** Delivery là aggregate gắn một gift transaction và conversation ba bên. Reputation là ledger `ReputationEvent`, tổng điểm là projection có thể dựng lại. Review chỉ được tạo bởi participant hợp lệ sau completion và được công bố theo cơ chế double-blind/deadline.

**Tech Stack:** NestJS, Prisma/PostgreSQL, BullMQ, Socket.IO, Next.js, Jest, Vitest, Playwright.

## Global Constraints

- Tình nguyện viên chỉ hỗ trợ vận chuyển; không có quyền moderator.
- Không lưu phí/thanh toán dưới dạng giao dịch tài chính; chỉ có `costNote` dạng văn bản cảnh báo tự thỏa thuận.
- Chỉ hiển thị quận/huyện trước selection; điểm gặp cụ thể nằm trong chat tự nguyện.
- Điểm uy tín 0–100; không trừ vì người dùng nhận nhiều đồ.
- Negative event chỉ do rule có bằng chứng hoặc moderator xác nhận.
- Review một lần/người/giao dịch; publish sau khi hai bên review hoặc hết hạn.

---

### Task 1: Volunteer delivery domain and assignment

**Files:**
- Create: `packages/contracts/src/deliveries.ts`
- Modify: `packages/contracts/src/enums.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_volunteer_delivery/migration.sql`
- Create: `apps/api/src/modules/deliveries/delivery-state.ts`
- Create: `apps/api/src/modules/deliveries/deliveries.service.ts`
- Create: `apps/api/src/modules/deliveries/deliveries.controller.ts`
- Create: `apps/api/src/modules/deliveries/deliveries.module.ts`
- Test: `apps/api/src/modules/deliveries/deliveries.service.spec.ts`
- Test: `apps/api/test/deliveries.e2e-spec.ts`

**Interfaces:**
- Consumes: active gift transaction and users with `VOLUNTEER` role.
- Produces: `POST /v1/transactions/:id/delivery-requests`; `GET /v1/deliveries/open`; `POST /v1/deliveries/:id/apply`; `POST /v1/deliveries/:id/select-volunteer`.

- [ ] **Step 1: Write failing role/privacy/assignment tests**

```ts
await expect(service.apply(nonVolunteerId, deliveryId)).rejects.toMatchObject({ code: 'VOLUNTEER_ROLE_REQUIRED' });
expect(publicDelivery).not.toHaveProperty('pickupAddress');
expect(publicDelivery).not.toHaveProperty('dropoffAddress');
```

Test two concurrent selections yield one selected volunteer.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test -- deliveries && pnpm --filter api test:e2e -- deliveries`

Expected: FAIL because delivery models are absent.

- [ ] **Step 3: Implement schema and selection transaction**

Define `DELIVERY_STATUSES = ['OPEN', 'VOLUNTEER_SELECTED', 'PICKUP_CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'SUPPORT_REQUIRED']`. Create `DeliveryRequest(transactionId unique, pickupArea, dropoffArea, timeWindowStart, timeWindowEnd, costNote, status)`, `DeliveryApplication`, `DeliveryAssignment`, `DeliveryEvent`. Validate time window future/max 14 days and cost note max 300. Selection creates/extends transaction conversation with the volunteer.

- [ ] **Step 4: Migrate and verify**

Run: `pnpm --filter api prisma migrate dev --name volunteer_delivery && pnpm --filter api test -- deliveries && pnpm --filter api test:e2e -- deliveries`

Expected: PASS; only donor/recipient create request and only participants select volunteer.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts apps/api/prisma apps/api/src/modules/deliveries apps/api/test/deliveries.e2e-spec.ts
git commit -m "feat: add volunteer delivery requests and assignment"
```

### Task 2: Delivery progress, three-party chat and cancellation

**Files:**
- Modify: `apps/api/src/modules/deliveries/delivery-state.ts`
- Modify: `apps/api/src/modules/deliveries/deliveries.service.ts`
- Modify: `apps/api/src/modules/deliveries/deliveries.controller.ts`
- Modify: `apps/api/src/modules/chat/chat.service.ts`
- Test: `apps/api/src/modules/deliveries/delivery-state.spec.ts`
- Test: `apps/api/test/delivery-progress.e2e-spec.ts`

**Interfaces:**
- Consumes: selected assignment and chat membership.
- Produces: `POST /v1/deliveries/:id/pickup`; `/in-transit`; `/deliver`; `/cancel`.

- [ ] **Step 1: Write transition and permission tests**

```ts
expect(applyDeliveryEvent('VOLUNTEER_SELECTED', 'PICKUP')).toBe('PICKUP_CONFIRMED');
expect(applyDeliveryEvent('PICKUP_CONFIRMED', 'START_TRANSIT')).toBe('IN_TRANSIT');
expect(() => applyDeliveryEvent('OPEN', 'DELIVER')).toThrow('DELIVERY_STATE_INVALID');
```

Assert only assigned volunteer advances pickup/transit and recipient confirms delivered.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test -- delivery-state && pnpm --filter api test:e2e -- delivery-progress`

Expected: FAIL until transitions are implemented.

- [ ] **Step 3: Implement progress and cancellation policy**

Append immutable events with actor/reason. Before pickup, any participant may cancel with reason; after pickup cancellation becomes `SUPPORT_REQUIRED` and notifies all parties. Remove volunteer conversation membership only when canceled before selection completion; retain history otherwise.

- [ ] **Step 4: Run state/E2E tests**

Run: `pnpm --filter api test -- deliveries chat && pnpm --filter api test:e2e -- delivery-progress`

Expected: PASS; three participants can chat, outsiders cannot, events remain ordered.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/deliveries apps/api/src/modules/chat apps/api/test/delivery-progress.e2e-spec.ts
git commit -m "feat: track volunteer delivery progress"
```

### Task 3: Reputation ledger and score projection

**Files:**
- Create: `packages/contracts/src/reputation.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_reputation_ledger/migration.sql`
- Create: `apps/api/src/modules/reputation/reputation-policy.ts`
- Create: `apps/api/src/modules/reputation/reputation.service.ts`
- Create: `apps/api/src/modules/reputation/reputation.worker.ts`
- Create: `apps/api/src/modules/reputation/reputation.controller.ts`
- Create: `apps/api/src/modules/reputation/reputation.module.ts`
- Test: `apps/api/src/modules/reputation/reputation-policy.spec.ts`
- Test: `apps/api/test/reputation.e2e-spec.ts`

**Interfaces:**
- Consumes: transaction/delivery events.
- Produces: `appendReputationEvent(eventKey,userId,type,points,evidenceId)`; `GET /v1/users/:id/reputation`.

- [ ] **Step 1: Write score/cap/idempotency tests**

```ts
expect(projectScore(50, [{ type: 'GIFT_COMPLETED', points: 2 }])).toBe(52);
expect(projectScore(99, [{ type: 'DELIVERY_COMPLETED', points: 3 }])).toBe(100);
expect(projectScore(3, [{ type: 'VERIFIED_NO_SHOW', points: -6 }])).toBe(0);
```

Assert duplicate `eventKey` produces one ledger row and receiving many gifts alone creates no negative event.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test -- reputation && pnpm --filter api test:e2e -- reputation`

Expected: FAIL because ledger/projection are absent.

- [ ] **Step 3: Implement ledger and public levels**

Create `ReputationEvent(eventKey unique, userId, type, points, evidenceType, evidenceId, createdAt)` and `ReputationProjection(userId unique, score, level, completedGifts, completedDeliveries, completionRate, updatedAt)`. Start verified users at 50. Initial policy: `GIFT_DONATED_COMPLETED +2`, `GIFT_RECEIVED_WITH_CONFIRMATION +1`, `DELIVERY_COMPLETED +3`, `POSITIVE_REVIEW +1` (monthly review bonus cap +2), `LATE_CANCEL_CONFIRMED -2`, `REPEATED_LATE_CANCEL -4`, `VERIFIED_NO_SHOW -6`, `COMMUNITY_VIOLATION -5..-20`. No negative event exists for receive count. Public level rules: zero completed actions → `NEW`; otherwise score below 60 or fewer than 3 completions → `VERIFIED`; score 60–74 with at least 3 → `TRUSTED`; score 75–89 with at least 10 → `ACTIVE`; score 90–100 with at least 25 → `AMBASSADOR`. Rebuild projection from ledger and aggregates.

- [ ] **Step 4: Migrate and test replay**

Run: `pnpm --filter api prisma migrate dev --name reputation_ledger && pnpm --filter api test -- reputation && pnpm --filter api test:e2e -- reputation`

Expected: live projection equals full replay; duplicate domain events do not change score twice.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts apps/api/prisma apps/api/src/modules/reputation apps/api/test/reputation.e2e-spec.ts
git commit -m "feat: add auditable reputation ledger"
```

### Task 4: Double-blind reviews and publication deadline

**Files:**
- Create: `packages/contracts/src/reviews.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_reviews/migration.sql`
- Create: `apps/api/src/modules/reviews/reviews.service.ts`
- Create: `apps/api/src/modules/reviews/reviews.controller.ts`
- Create: `apps/api/src/modules/reviews/review-publish.worker.ts`
- Create: `apps/api/src/modules/reviews/reviews.module.ts`
- Test: `apps/api/src/modules/reviews/reviews.service.spec.ts`
- Test: `apps/api/test/reviews.e2e-spec.ts`

**Interfaces:**
- Consumes: completed gift/delivery participants.
- Produces: `POST /v1/transactions/:id/reviews`; `GET /v1/users/:id/reviews`.

- [ ] **Step 1: Write eligibility/privacy tests**

Assert stranger/incomplete transaction rejected, duplicate reviewer-target-transaction rejected, first review hidden, both reviews publish together, and seven-day deadline publishes the submitted review.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test -- reviews && pnpm --filter api test:e2e -- reviews`

Expected: FAIL because review model is absent.

- [ ] **Step 3: Implement review model and criteria**

Create `Review(transactionId, reviewerId, subjectId, roleContext, communication, punctuality, itemAccuracy nullable, care nullable, comment, submittedAt, publishedAt)` with composite unique. Validate scores 1–5 and comment max 500; strip phone/email from public comment and create moderation flag when detected.

- [ ] **Step 4: Verify publication and reputation link**

Run: `pnpm --filter api prisma migrate dev --name reviews && pnpm --filter api test -- reviews reputation && pnpm --filter api test:e2e -- reviews`

Expected: PASS; published positive review creates capped reputation event once.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts apps/api/prisma apps/api/src/modules/reviews apps/api/test/reviews.e2e-spec.ts
git commit -m "feat: add double blind participant reviews"
```

### Task 5: Volunteer, trust profile and review UI

**Files:**
- Create: `apps/web/src/features/deliveries/delivery-request-form.tsx`
- Create: `apps/web/src/features/deliveries/delivery-card.tsx`
- Create: `apps/web/src/features/deliveries/delivery-timeline.tsx`
- Create: `apps/web/src/features/reputation/trust-card.tsx`
- Create: `apps/web/src/features/reviews/review-form.tsx`
- Create: `apps/web/src/app/(app)/tinh-nguyen/page.tsx`
- Create: `apps/web/src/app/(app)/ho-so/[id]/page.tsx`
- Test: `apps/web/tests/deliveries/delivery.test.tsx`
- Test: `apps/web/tests/reputation/trust-card.test.tsx`
- Test: `apps/web/e2e/volunteer-reputation.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–4 endpoints.
- Produces: complete volunteer/reputation browser slice.

- [ ] **Step 1: Write failing UI/accessibility tests**

Test role gate, area labels (22 quận/huyện), cost note warning `Nền tảng không thu tiền`, timeline actions, trust level plus evidence counts, new-user label and role-specific review criteria.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter web test -- deliveries reputation && pnpm --filter web test:e2e -- volunteer-reputation`

Expected: FAIL because routes/components are absent.

- [ ] **Step 3: Implement delivery screens**

Add open-delivery filters, apply/select flow, three-party conversation deep link, status timeline and cancel/support copy. Never render structured exact-address fields.

- [ ] **Step 4: Implement trust/review screens and verify**

Render score 0–100, level, verified badge, completed counts/rate and reviews; do not expose internal risk or violation detail. Run web tests/E2E/build.

Expected: a volunteer completes a delivery and all valid parties submit/publish reviews; projection updates exactly once.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features apps/web/src/app apps/web/tests apps/web/e2e/volunteer-reputation.spec.ts
git commit -m "feat: add volunteer and reputation experience"
```

### Task 6: Volunteer and reputation release gate

**Files:**
- Create: `apps/api/test/volunteer-reputation-gate.e2e-spec.ts`
- Create: `docs/runbooks/reputation-rebuild.md`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: Plan 4 release gate.

- [ ] **Step 1: Add end-to-end gate**

Cover assignment race, progress permissions, three-party chat, cancellation after pickup, double-blind review, deadline publish, ledger idempotency and projection replay.

- [ ] **Step 2: Run gate**

Run: `pnpm --filter api test:e2e -- volunteer-reputation-gate`

Expected: PASS.

- [ ] **Step 3: Document reputation rebuild/appeal evidence**

Document dry-run projection rebuild, diff inspection, atomic swap, rollback and prohibition on direct score edits.

- [ ] **Step 4: Run repository verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/test/volunteer-reputation-gate.e2e-spec.ts docs/runbooks/reputation-rebuild.md .github/workflows/ci.yml
git commit -m "test: add volunteer and reputation release gate"
```
