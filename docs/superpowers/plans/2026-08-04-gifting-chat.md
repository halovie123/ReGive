# Gift Transactions, Chat and Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thành quy trình người nhận gửi yêu cầu, người tặng chọn một người atomic, hai bên chat realtime và xác nhận trao tặng có lịch sử/audit.

**Architecture:** Requests và Gift Transactions là hai module với state machine rõ ràng; accept request khóa listing trong PostgreSQL transaction. Chat lưu PostgreSQL trước khi phát Socket.IO, dùng Redis adapter khi scale. Notification được ghi vào outbox cùng transaction rồi worker phát, tránh trạng thái đã đổi nhưng mất thông báo.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Socket.IO, Redis, BullMQ, Next.js, TanStack Query, Jest, Vitest, Playwright.

## Global Constraints

- Người dùng không thể xin nhận listing của chính mình.
- Một user chỉ có một request hoạt động trên mỗi listing.
- Một listing chỉ có một reservation hoạt động; cạnh tranh đồng thời phải có đúng một winner.
- Conversation chỉ tạo theo request/transaction; không có direct message tùy ý.
- Message được persist trước emit; reconnect dùng cursor để lấy phần thiếu.
- Giao dịch chỉ `COMPLETED` đầy đủ khi hai bên xác nhận; mâu thuẫn → `SUPPORT_REQUIRED`.
- Mọi mutation nhạy cảm chấp nhận `Idempotency-Key`.

---

### Task 1: Receive requests and atomic recipient selection

**Files:**
- Create: `packages/contracts/src/requests.ts`
- Modify: `packages/contracts/src/enums.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_receive_requests/migration.sql`
- Create: `apps/api/src/modules/requests/request-state.ts`
- Create: `apps/api/src/modules/requests/requests.service.ts`
- Create: `apps/api/src/modules/requests/requests.controller.ts`
- Create: `apps/api/src/modules/requests/requests.module.ts`
- Test: `apps/api/src/modules/requests/requests.service.spec.ts`
- Test: `apps/api/test/recipient-selection.concurrent.e2e-spec.ts`

**Interfaces:**
- Consumes: `PUBLISHED` listing and authenticated users.
- Produces: `POST /v1/listings/:id/requests`; `GET /v1/listings/:id/requests`; `POST /v1/requests/:id/withdraw`; `POST /v1/requests/:id/accept`.

- [ ] **Step 1: Write failing invariants/concurrency tests**

```ts
await expect(service.create(ownerId, ownerListingId, { message: validMessage }))
  .rejects.toMatchObject({ code: 'SELF_REQUEST_FORBIDDEN' });

const results = await Promise.allSettled([
  accept(requestA, 'key-a'), accept(requestB, 'key-b')
]);
expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
```

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test -- requests && pnpm --filter api test:e2e -- recipient-selection.concurrent`

Expected: FAIL because request model/service are absent.

- [ ] **Step 3: Implement schema and transaction**

Define `REQUEST_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED', 'COMPLETED']`. Create `ReceiveRequest(id, listingId, requesterId, message, status, createdAt, updatedAt)` with unique active relationship and indexes. Accept flow uses serializable transaction/advisory row lock: verify listing owner/status, accept selected request, reserve listing, create gift transaction, decline remaining pending requests, append events and outbox notifications.

- [ ] **Step 4: Run migration and concurrency suite**

Run: `pnpm --filter api prisma migrate dev --name receive_requests && pnpm --filter api test && pnpm --filter api test:e2e -- recipient-selection.concurrent`

Expected: exactly one accept succeeds; retries with same idempotency key return same result.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts apps/api/prisma apps/api/src/modules/requests apps/api/test/recipient-selection.concurrent.e2e-spec.ts
git commit -m "feat: add receive requests and atomic recipient selection"
```

### Task 2: Gift transaction state machine and dual confirmation

**Files:**
- Create: `packages/contracts/src/transactions.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_gift_transactions/migration.sql`
- Create: `apps/api/src/modules/transactions/transaction-state.ts`
- Create: `apps/api/src/modules/transactions/transactions.service.ts`
- Create: `apps/api/src/modules/transactions/transactions.controller.ts`
- Create: `apps/api/src/modules/transactions/transactions.module.ts`
- Create: `apps/api/src/modules/transactions/completion-reminder.worker.ts`
- Test: `apps/api/src/modules/transactions/transaction-state.spec.ts`
- Test: `apps/api/test/transactions.e2e-spec.ts`

**Interfaces:**
- Consumes: transaction created by request acceptance.
- Produces: `GET /v1/me/transactions`; `POST /v1/transactions/:id/arrange`; `POST /v1/transactions/:id/confirm`; `POST /v1/transactions/:id/cancel`; `POST /v1/transactions/:id/reopen`.

- [ ] **Step 1: Write state-table tests**

```ts
expect(applyTransactionEvent('RESERVED', 'ARRANGE')).toBe('ARRANGING');
expect(resolveConfirmations({ donor: true, recipient: true })).toBe('COMPLETED');
expect(resolveConfirmations({ donor: true, recipient: false, conflicting: true })).toBe('SUPPORT_REQUIRED');
expect(() => applyTransactionEvent('COMPLETED', 'CANCEL')).toThrow('TRANSACTION_STATE_INVALID');
```

- [ ] **Step 2: Run tests and see red**

Run: `pnpm --filter api test -- transaction-state && pnpm --filter api test:e2e -- transactions`

Expected: FAIL because states/models are absent.

- [ ] **Step 3: Implement event history and confirmation rules**

Define `TRANSACTION_STATUSES = ['RESERVED', 'ARRANGING', 'HANDOVER_PENDING', 'COMPLETION_PENDING_REVIEW', 'COMPLETED', 'CANCELLED', 'SUPPORT_REQUIRED', 'REOPENED']`. Create `GiftTransaction`, `TransactionConfirmation`, `TransactionEvent`. Store actor, previous/new state, reason code and timestamp. Both confirmations complete listing/request/transaction atomically. One-sided confirmation after 72 hours becomes `COMPLETION_PENDING_REVIEW`; cancellation may reopen listing only by donor and records why.

- [ ] **Step 4: Verify transition matrix**

Run: `pnpm --filter api prisma migrate dev --name gift_transactions && pnpm --filter api test -- transaction && pnpm --filter api test:e2e -- transactions`

Expected: PASS for valid transitions and explicit rejection of every invalid transition fixture.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts apps/api/prisma apps/api/src/modules/transactions apps/api/test/transactions.e2e-spec.ts
git commit -m "feat: add gift transaction confirmation lifecycle"
```

### Task 3: Persistent chat and authorized realtime gateway

**Files:**
- Create: `packages/contracts/src/chat.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_chat/migration.sql`
- Create: `apps/api/src/modules/chat/chat.service.ts`
- Create: `apps/api/src/modules/chat/chat.controller.ts`
- Create: `apps/api/src/modules/chat/chat.gateway.ts`
- Create: `apps/api/src/modules/chat/socket-ticket.service.ts`
- Create: `apps/api/src/modules/chat/user-block.service.ts`
- Create: `apps/api/src/modules/chat/chat.module.ts`
- Test: `apps/api/src/modules/chat/chat.service.spec.ts`
- Test: `apps/api/test/chat.e2e-spec.ts`

**Interfaces:**
- Consumes: accepted request/transaction membership.
- Produces: `POST /v1/socket-ticket`; `GET /v1/conversations`; `GET /v1/conversations/:id/messages?cursor=`; `POST/DELETE /v1/users/:id/block`; `POST /v1/conversations/:id/attachments/sign`; Socket events `message:send`, `message:created`, `message:read`.

- [ ] **Step 1: Write persistence and authorization tests**

```ts
await expect(chat.listMessages(strangerId, conversationId)).rejects.toMatchObject({ code: 'CONVERSATION_FORBIDDEN' });
await gateway.handleSend(memberSocket, { conversationId, clientMessageId: 'm-local-1', body: 'Chào bạn' });
expect(await prisma.message.count({ where: { clientMessageId: 'm-local-1' } })).toBe(1);
```

Test repeated send with same `(senderId, clientMessageId)` returns the existing message; blocked users cannot send; outsider cannot sign an attachment upload.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test -- chat && pnpm --filter api test:e2e -- chat`

Expected: FAIL because chat schema/gateway are absent.

- [ ] **Step 3: Implement conversations and socket tickets**

Install `pnpm --filter api add @nestjs/websockets @nestjs/platform-socket.io socket.io @socket.io/redis-adapter redis bullmq`.

Create `Conversation`, `ConversationMember`, `Message`, `MessageAttachment`, `MessageReport`, `UserBlock(blockerId, blockedId)`. Generate a single-use 60-second socket ticket through authenticated REST; store hashed ticket in Redis. Gateway consumes ticket, joins only authorized rooms, checks blocks, rate limits sends, persists message, then emits canonical server message. Reuse the media storage port for conversation-scoped JPEG/PNG/WebP attachments up to 8 MB and strip metadata before making them readable to members.

- [ ] **Step 4: Test reconnect and duplicate delivery**

Run: `pnpm --filter api prisma migrate dev --name chat && pnpm --filter api test -- chat && pnpm --filter api test:e2e -- chat`

Expected: offline messages are returned by cursor; reconnect does not duplicate `clientMessageId`; strangers receive 403/connection rejection.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts apps/api/prisma apps/api/src/modules/chat apps/api/test/chat.e2e-spec.ts
git commit -m "feat: add persistent authorized realtime chat"
```

### Task 4: Transactional outbox and in-web notifications

**Files:**
- Create: `packages/contracts/src/notifications.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_notifications_outbox/migration.sql`
- Create: `apps/api/src/modules/notifications/outbox.service.ts`
- Create: `apps/api/src/modules/notifications/notification.worker.ts`
- Create: `apps/api/src/modules/notifications/notifications.controller.ts`
- Create: `apps/api/src/modules/notifications/notifications.module.ts`
- Test: `apps/api/src/modules/notifications/outbox.service.spec.ts`
- Test: `apps/api/test/notifications.e2e-spec.ts`

**Interfaces:**
- Consumes: domain events from requests/transactions/chat.
- Produces: `GET /v1/notifications`; `POST /v1/notifications/:id/read`; Socket event `notification:created`.

- [ ] **Step 1: Write outbox atomicity tests**

Assert request acceptance and its outbox rows commit together; forcing outbox insert failure rolls back acceptance. Assert worker retry creates one notification due unique event key.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test -- outbox && pnpm --filter api test:e2e -- notifications`

Expected: FAIL because outbox/notification models are absent.

- [ ] **Step 3: Implement outbox and worker**

Create `OutboxEvent(id, type, aggregateId, payload, availableAt, processedAt, attempts)` and `Notification(id, userId, type, data, readAt, eventKey unique)`. Poll with `FOR UPDATE SKIP LOCKED`; create notification and mark processed in one transaction; emit realtime only after commit. Retry with exponential backoff at most five times, then mark dead-letter and alert without dropping the row.

- [ ] **Step 4: Run retry/idempotency tests**

Run: `pnpm --filter api prisma migrate dev --name notifications_outbox && pnpm --filter api test -- notification && pnpm --filter api test:e2e -- notifications`

Expected: PASS; retry/dead-letter fixtures do not duplicate user notifications.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts apps/api/prisma apps/api/src/modules/notifications apps/api/test/notifications.e2e-spec.ts
git commit -m "feat: deliver transactional user notifications"
```

### Task 5: Web requests, activity, chat and notification center

**Files:**
- Create: `apps/web/src/features/requests/request-dialog.tsx`
- Create: `apps/web/src/features/requests/request-card.tsx`
- Create: `apps/web/src/features/transactions/transaction-timeline.tsx`
- Create: `apps/web/src/features/chat/conversation-list.tsx`
- Create: `apps/web/src/features/chat/conversation-panel.tsx`
- Create: `apps/web/src/features/chat/use-chat-socket.ts`
- Create: `apps/web/src/features/notifications/notification-menu.tsx`
- Create: `apps/web/src/app/(app)/hoat-dong/page.tsx`
- Create: `apps/web/src/app/(app)/tin-nhan/page.tsx`
- Create: `apps/web/src/app/(app)/thong-bao/page.tsx`
- Test: `apps/web/tests/requests/request-dialog.test.tsx`
- Test: `apps/web/tests/chat/chat.test.tsx`
- Test: `apps/web/e2e/gifting-chat.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–4 APIs/events.
- Produces: complete donor/recipient flow in browser.

- [ ] **Step 1: Write failing interaction tests**

Test 20-character meaningful request minimum, disabled self-request, donor selection confirmation, transaction timeline labels, optimistic message keyed by `clientMessageId`, reconnect reconciliation and unread notification count.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter web test -- requests chat && pnpm --filter web test:e2e -- gifting-chat`

Expected: FAIL because feature routes are absent.

- [ ] **Step 3: Implement request/activity UI**

Add request dialog on detail page, donor request queue with profile/trust summary, accept confirmation, declined copy and activity tabs. Generate UUID idempotency keys per user intent and retain only until canonical response.

- [ ] **Step 4: Implement chat/notifications and run E2E**

Install `pnpm --filter web add socket.io-client`.

Use REST history plus socket ticket; render pending/sent/read/failed states, retry safely, header with listing/transaction status, block/report entry points. Run: `pnpm --filter web test && pnpm --filter web test:e2e -- gifting-chat && pnpm --filter web build`.

Expected: two browser contexts complete request → selection → chat → dual confirmation without refresh.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features apps/web/src/app apps/web/tests apps/web/e2e/gifting-chat.spec.ts
git commit -m "feat: add gifting activity chat and notifications ui"
```

### Task 6: Gifting release gate

**Files:**
- Create: `apps/api/test/gifting-gate.e2e-spec.ts`
- Create: `docs/runbooks/chat-and-outbox.md`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: Plan 3 release gate.

- [ ] **Step 1: Add gate test**

Cover parallel accepts, idempotent mutation, authorized chat, disconnect/replay, outbox retry, dual confirmation, cancellation/reopen and support-required conflict.

- [ ] **Step 2: Run gate**

Run: `pnpm --filter api test:e2e -- gifting-gate`

Expected: PASS.

- [ ] **Step 3: Document recovery procedures**

Document replaying outbox, inspecting dead letters, disabling socket traffic, reconciling a transaction and preserving audit history.

- [ ] **Step 4: Run full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/test/gifting-gate.e2e-spec.ts docs/runbooks/chat-and-outbox.md .github/workflows/ci.yml
git commit -m "test: add gifting chat and notification release gate"
```
