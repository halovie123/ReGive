# Listings and Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép người dùng đăng vật phẩm an toàn, tải ảnh, kiểm duyệt rủi ro sơ bộ và khám phá theo danh mục và 22 quận/huyện TP.HCM.

**Architecture:** Listings module sở hữu vòng đời bài đăng và metadata ảnh. Upload dùng signed URL Supabase Storage; worker xác minh/xóa metadata/tạo thumbnail trước khi ảnh được gắn vào listing. Discovery chỉ đọc listing `PUBLISHED` qua cursor pagination và PostgreSQL full-text search.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL 17 (Supabase 17.6), BullMQ/Redis, Supabase Storage, Next.js 16, TanStack Query, React Hook Form, Zod, MapLibre GL, Jest, Vitest, Playwright.

## Global Constraints

- Chỉ `HOUSEHOLD`, `CLOTHING`, `BOOKS`, `CHILDREN`, `DEVICES`.
- Listing công khai chỉ hiển thị `AreaCode`, không có địa chỉ/tọa độ người dùng.
- 1–6 ảnh; JPEG/PNG/WebP; tối đa 8 MB/ảnh; xóa EXIF/GPS trước publish.
- Rủi ro thấp → `PUBLISHED`; vừa → `PENDING_REVIEW`; cao → `MODERATION_HIDDEN`.
- Search dùng cursor ổn định `(publishedAt,id)`; không dùng offset ở feed chính.
- Chỉ chủ listing được sửa/rút; backend xác minh mọi quyền.
- Bộ lọc khu vực chạy trên 22 quận/huyện TP.HCM (`AREA_CODES` trong `packages/contracts/src/enums.ts`), không phải 4 xã: UI cần nhóm hoặc tìm kiếm chứ không dùng 4 checkbox, và index discovery phải tính theo 22 giá trị.
- Không gắn `VerifiedPhoneGuard` (hay bất kỳ điều kiện phone nào) lên endpoint listings: xác minh số điện thoại đã bị gỡ bỏ, gắn vào sẽ khóa 100% người dùng.

## Amendments before implementation (2026-10-04)

Chủ sản phẩm đã chốt: **không trả phí hạ tầng nào** trong MVP (Render free,
Supabase free, Vercel free). Các phần bên dưới mâu thuẫn với điều đó hoặc với
thực tế đã thay đổi; khi đọc task, áp dụng các sửa đổi này trước.

1. **Không Redis, không BullMQ.** Production không có Redis và sẽ không có.
   - Task 2: không có `image.worker.ts` chạy nền. `POST .../images/complete`
     xử lý ảnh **ngay trong request** (tải về, kiểm tra, xoay, xoá metadata,
     xuất WebP + thumbnail, băm, đánh dấu `READY`). Không cài `bullmq`.
   - Task 3: không có `listing-expiry.worker.ts`. Bài hết hạn bị loại bằng
     điều kiện `expiresAt > now()` trong mọi truy vấn công khai, nên đúng đắn
     không phụ thuộc vào việc có job chạy hay không. Việc ghi trạng thái
     `EXPIRED` là phụ, chạy lười (idempotent) khi có request.
2. **Ảnh lưu ở Supabase Storage**, upload trực tiếp từ trình duyệt bằng signed
   URL. API cần quyền Storage: dùng **khoá S3 của Supabase Storage** (chỉ có
   quyền Storage), không đưa `SUPABASE_SERVICE_ROLE_KEY` (toàn quyền database)
   trở lại. Render free có 512 MB RAM: `sharp` phải đặt `limitInputPixels`
   và xử lý từng ảnh một.
3. **Task 4:** owner summary chỉ gồm tên hiển thị và avatar. "Trust level" và
   "completed count" thuộc Plan 4, hiện chưa tồn tại. Bỏ assertion `EXPLAIN`
   (phụ thuộc planner, dễ vỡ); thay bằng kiểm tra index tồn tại.
4. **Task 5:** Việt Nam bỏ cấp quận/huyện từ 1/7/2025, nên GeoJSON 22 quận cũ
   khó có nguồn tái sử dụng hợp pháp. MVP làm **danh sách + bộ lọc khu vực
   có tìm kiếm**; bản đồ hoãn lại, chờ chủ sản phẩm quyết. Câu "GeoJSON chứa
   đúng bốn feature" đã lỗi thời. Không cài `maplibre-gl`; `react-hook-form`,
   `@hookform/resolvers`, `zod` đã có sẵn trong web.
5. **Vòng đời (Task 1):** `SUBMIT` đưa `DRAFT → PENDING_REVIEW`, để không gì
   lên công khai khi chưa qua sàng lọc. Task 3 cho bài rủi ro thấp đi tiếp
   `APPROVE → PUBLISHED` trong cùng transaction. Sửa bài đang `PUBLISHED`
   đưa nó về `PENDING_REVIEW`, nếu không người ta có thể đăng nội dung sạch
   rồi sửa thành nội dung cấm. `RESERVED`/`COMPLETED` thuộc Plan 3.
6. Code API mà unit test nạp **không được import giá trị** từ
   `@buy-nothing/contracts` (Jest không transform được ESM `dist/`); dùng
   `import type` hoặc enum của Prisma.

---

### Task 1: Listing domain, persistence and state transitions

**Files:**
- Modify: `packages/contracts/src/enums.ts`
- Create: `packages/contracts/src/listings.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_listings/migration.sql`
- Create: `apps/api/src/modules/listings/listing-state.ts`
- Create: `apps/api/src/modules/listings/listings.repository.ts`
- Create: `apps/api/src/modules/listings/listings.service.ts`
- Create: `apps/api/src/modules/listings/listings.controller.ts`
- Create: `apps/api/src/modules/listings/listings.module.ts`
- Test: `apps/api/src/modules/listings/listing-state.spec.ts`
- Test: `apps/api/test/listings.e2e-spec.ts`

**Interfaces:**
- Consumes: authenticated user, `AreaCode` and user roles from Plan 1.
- Produces: `POST /v1/listings`, `GET/PATCH /v1/listings/:id`, `POST /v1/listings/:id/publish`, `POST /v1/listings/:id/withdraw`.

- [ ] **Step 1: Write failing transition and authorization tests**

```ts
expect(transitionListing('DRAFT', 'SUBMIT')).toBe('PENDING_REVIEW');
expect(() => transitionListing('COMPLETED', 'EDIT')).toThrow('LISTING_STATE_INVALID');
await expect(service.update(otherUserId, listingId, input)).rejects.toMatchObject({ code: 'LISTING_FORBIDDEN' });
```

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test -- listing-state && pnpm --filter api test:e2e -- listings`

Expected: FAIL because listing contracts/models are absent.

- [ ] **Step 3: Implement contracts and model**

Define exact values:

```ts
const LISTING_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'RESERVED', 'COMPLETED', 'WITHDRAWN', 'EXPIRED', 'MODERATION_HIDDEN'] as const;
const ITEM_CATEGORIES = ['HOUSEHOLD', 'CLOTHING', 'BOOKS', 'CHILDREN', 'DEVICES'] as const;
const ITEM_CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const;
```

Create `Listing(id, ownerId, title, description, defects, category, condition, areaCode, status, publishedAt, expiresAt, createdAt, updatedAt)` and indexes on status/category/area/publishedAt. Require DONOR role, title 5–100, description 20–2000 and defects 0–800.

- [ ] **Step 4: Migrate and verify**

Run: `pnpm --filter api prisma migrate dev --name listings && pnpm --filter api test && pnpm --filter api test:e2e -- listings`

Expected: PASS; completed/hidden listings reject edits; unauthorized access returns 403.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts apps/api/prisma apps/api/src/modules/listings apps/api/test/listings.e2e-spec.ts
git commit -m "feat: add listing domain and lifecycle"
```

### Task 2: Secure image upload and processing pipeline

**Files:**
- Create: `packages/contracts/src/uploads.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_listing_images/migration.sql`
- Create: `apps/api/src/modules/media/object-storage.ts`
- Create: `apps/api/src/modules/media/supabase-storage.adapter.ts`
- Create: `apps/api/src/modules/media/media.controller.ts`
- Create: `apps/api/src/modules/media/media.service.ts`
- Create: `apps/api/src/modules/media/image.worker.ts`
- Test: `apps/api/src/modules/media/media.service.spec.ts`
- Test: `apps/api/test/media.e2e-spec.ts`

**Interfaces:**
- Consumes: owner/listing from Task 1.
- Produces: `POST /v1/listings/:id/images/sign`; `POST /v1/listings/:id/images/complete`; `ProcessedImage {key, thumbnailKey, width, height, sha256}`.

- [ ] **Step 1: Write failing upload policy tests**

```ts
expect(() => UploadIntentSchema.parse({ mime: 'image/svg+xml', bytes: 10 })).toThrow();
expect(() => UploadIntentSchema.parse({ mime: 'image/jpeg', bytes: 8_000_001 })).toThrow();
await expect(service.signUpload(otherUser, listingId, validIntent)).rejects.toMatchObject({ code: 'LISTING_FORBIDDEN' });
```

- [ ] **Step 2: Verify failures**

Run: `pnpm --filter api test -- media && pnpm --filter api test:e2e -- media`

Expected: FAIL because storage port and image records are absent.

- [ ] **Step 3: Implement storage port and worker**

Install `pnpm --filter api add @supabase/supabase-js bullmq sharp file-type`.

Create `ListingImage(id, listingId, objectKey unique, thumbnailKey, order, status, width, height, sha256)`. Signed keys follow `listing/{ownerId}/{listingId}/{uuid}` and expire after 10 minutes. Worker decodes the image, rejects decompression bombs, rotates orientation, strips metadata, converts canonical WebP plus thumbnail, hashes output and marks `READY`.

- [ ] **Step 4: Run tests including fake storage**

Run: `pnpm --filter api test -- media && pnpm --filter api test:e2e -- media`

Expected: PASS; seventh image, wrong owner, bad MIME and oversized file are rejected; GPS fixture no longer contains EXIF.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/uploads.ts apps/api/prisma apps/api/src/modules/media apps/api/test/media.e2e-spec.ts
git commit -m "feat: add secure listing image pipeline"
```

### Task 3: Risk screening, publish workflow and expiry job

**Files:**
- Create: `apps/api/src/modules/listings/listing-risk.ts`
- Create: `apps/api/src/modules/listings/listing-policy.ts`
- Create: `apps/api/src/modules/listings/listing-expiry.worker.ts`
- Modify: `apps/api/src/modules/listings/listings.service.ts`
- Test: `apps/api/src/modules/listings/listing-risk.spec.ts`
- Test: `apps/api/test/listing-publish.e2e-spec.ts`

**Interfaces:**
- Consumes: listing/images from Tasks 1–2.
- Produces: `assessListing(input): {level:'LOW'|'MEDIUM'|'HIGH'; reasons:string[]}` and deterministic publish decision.

- [ ] **Step 1: Write policy table tests**

```ts
expect(assessListing({ title: 'Tặng thuốc', description: 'còn hạn', defects: '' }).level).toBe('HIGH');
expect(assessListing({ title: 'Tủ gỗ', description: 'Liên hệ 0909123456', defects: 'trầy nhẹ' }).level).toBe('MEDIUM');
expect(assessListing(safeBookFixture).level).toBe('LOW');
```

Also test publish requires at least one `READY` image and complete defects/condition.

- [ ] **Step 2: Run and see tests fail**

Run: `pnpm --filter api test -- listing-risk && pnpm --filter api test:e2e -- listing-publish`

Expected: FAIL with missing assessor.

- [ ] **Step 3: Implement deterministic screening**

Normalize Vietnamese text, match blocked category terms, phone/email/URL patterns and duplicate image hashes. Persist reason codes in `ListingRiskAssessment`. LOW publishes with 30-day expiry; MEDIUM becomes `PENDING_REVIEW`; HIGH becomes `MODERATION_HIDDEN`. Expiry worker changes due `PUBLISHED` records to `EXPIRED` idempotently.

- [ ] **Step 4: Verify all branches**

Run: `pnpm --filter api test -- listing && pnpm --filter api test:e2e -- listing-publish`

Expected: PASS with exact LOW/MEDIUM/HIGH state assertions and repeatable expiry job.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/listings apps/api/test/listing-publish.e2e-spec.ts
git commit -m "feat: screen and publish listings by risk"
```

### Task 4: Discovery API, cursor search and area aggregation

**Files:**
- Create: `packages/contracts/src/discovery.ts`
- Create: `apps/api/src/modules/discovery/cursor.ts`
- Create: `apps/api/src/modules/discovery/discovery.repository.ts`
- Create: `apps/api/src/modules/discovery/discovery.service.ts`
- Create: `apps/api/src/modules/discovery/discovery.controller.ts`
- Create: `apps/api/src/modules/discovery/discovery.module.ts`
- Create: `apps/api/prisma/migrations/*_listing_search/migration.sql`
- Test: `apps/api/src/modules/discovery/cursor.spec.ts`
- Test: `apps/api/test/discovery.e2e-spec.ts`

**Interfaces:**
- Consumes: `PUBLISHED` listings.
- Produces: `GET /v1/discovery/listings`; `GET /v1/discovery/areas`; opaque `nextCursor`.

- [ ] **Step 1: Write failing pagination/filter tests**

Seed records sharing the same `publishedAt`; assert page 1 and page 2 have no duplicate/missing IDs. Assert non-published listings never appear and `area=HOC_MON&category=BOOKS&q=giao khoa` returns only matching rows.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter api test -- cursor && pnpm --filter api test:e2e -- discovery`

Expected: FAIL because search indexes/repository are absent.

- [ ] **Step 3: Implement query and stable cursor**

Encode `{ publishedAt, id }` as URL-safe base64 JSON; validate before query. Add PostgreSQL generated search vector/GIN index and composite discovery indexes. Return public owner summary only: display name, avatar, trust level, completed count; never phone/provider subject.

- [ ] **Step 4: Run query plans and tests**

Run: `pnpm --filter api prisma migrate dev --name listing_search && pnpm --filter api test -- discovery && pnpm --filter api test:e2e -- discovery`

Expected: PASS; seeded query uses relevant index under `EXPLAIN` assertion fixture.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/discovery.ts apps/api/prisma apps/api/src/modules/discovery apps/api/test/discovery.e2e-spec.ts
git commit -m "feat: add listing discovery and area search"
```

### Task 5: Web create-listing and discovery vertical slice

**Files:**
- Create: `apps/web/src/features/listings/listing-form.tsx`
- Create: `apps/web/src/features/listings/image-uploader.tsx`
- Create: `apps/web/src/features/listings/listing-card.tsx`
- Create: `apps/web/src/features/discovery/discovery-filters.tsx`
- Create: `apps/web/src/features/discovery/area-map.tsx`
- Create: `apps/web/public/areas/hoc-mon.geojson`
- Create: `apps/web/src/app/(app)/dang-tang/page.tsx`
- Create: `apps/web/src/app/(app)/kham-pha/page.tsx`
- Create: `apps/web/src/app/(app)/vat-pham/[id]/page.tsx`
- Test: `apps/web/tests/listings/listing-form.test.tsx`
- Test: `apps/web/tests/discovery/discovery.test.tsx`
- Test: `apps/web/e2e/listing-discovery.spec.ts`

**Interfaces:**
- Consumes: upload/listing/discovery APIs from Tasks 1–4.
- Produces: mobile-first publish and discovery UI.

- [ ] **Step 1: Write failing UI tests**

Test required labels, 1–6 image validation, defects prompt, safe-area names, filter persistence in URL and absence of exact-distance text. Validate GeoJSON contains exactly four features with codes matching `AREA_CODES`.

- [ ] **Step 2: Verify red state**

Run: `pnpm --filter web test -- listing-form discovery && pnpm --filter web test:e2e -- listing-discovery`

Expected: FAIL because routes/components are absent.

- [ ] **Step 3: Implement create flow and signed uploads**

Install `pnpm --filter web add @tanstack/react-query react-hook-form @hookform/resolvers zod maplibre-gl`.

Build draft-first form, direct upload with progress/retry, preview, risk-state result and Vietnamese errors. Persist only draft ID in session state; do not store image bytes or sensitive content locally.

- [ ] **Step 4: Implement discovery/list/detail and verify**

Use accessible cards/skeleton/empty/error states, cursor infinite list, filters in URL and MapLibre polygon fill/count labels only. Obtain and document a legally reusable administrative GeoJSON — ranh giới cấp quận/huyện cho toàn TP.HCM (22 vùng), không phải 4 xã Hóc Môn; simplify geometry for web (bộ 22 quận/huyện nặng hơn đáng kể) and assert no user coordinates are present.

Run: `pnpm --filter web test && pnpm --filter web test:e2e -- listing-discovery && pnpm --filter web build`.

Expected: donor publishes a safe listing; another authenticated user discovers it by area/category and sees no precise location.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features apps/web/src/app apps/web/public/areas apps/web/tests apps/web/e2e/listing-discovery.spec.ts docs/runbooks
git commit -m "feat: add listing creation and area discovery ui"
```

### Task 6: Listings release gate

**Files:**
- Create: `apps/api/test/listings-gate.e2e-spec.ts`
- Create: `docs/runbooks/listing-moderation.md`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: Plan 2 release gate.

- [ ] **Step 1: Add gate test**

Exercise safe publish, medium pending review, high hidden, owner-only mutation, expiry, cursor pagination and sanitized public response.

- [ ] **Step 2: Run gate and fix only uncovered defects**

Run: `pnpm --filter api test:e2e -- listings-gate`

Expected: PASS after all required behavior exists.

- [ ] **Step 3: Document moderation reason codes and operator actions**

List each reason code, user-facing copy and whether an operator may publish, reject or request edits.

- [ ] **Step 4: Run repository verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/test/listings-gate.e2e-spec.ts docs/runbooks/listing-moderation.md .github/workflows/ci.yml
git commit -m "test: add listings and discovery release gate"
```
