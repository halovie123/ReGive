# ReGive (Buy Nothing TP.HCM) MVP Implementation Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đặc tả đã duyệt thành năm vertical plan có thể triển khai và kiểm thử độc lập, kết thúc bằng một MVP closed-beta chạy được.

**Architecture:** Monorepo pnpm gồm Next.js web, NestJS modular monolith API và package contract dùng chung. PostgreSQL là nguồn dữ liệu bền vững; Redis phục vụ queue/presence; Supabase cung cấp OAuth (Google, Facebook) và object storage nhưng mọi nghiệp vụ đi qua NestJS.

**Tech Stack:** Node.js 22 LTS (`>=22.12 <23`), pnpm 11, TypeScript 5.4+, Next.js 16, React 19.2, NestJS 11, Prisma 7, PostgreSQL 17 (Supabase 17.6), Redis, BullMQ, Socket.IO, Supabase Auth/Storage, Jest, Vitest, Playwright.

## Global Constraints

- Sản phẩm web tiếng Việt, mobile-first; không xây native app trong MVP.
- Marketplace, hồ sơ và chat yêu cầu đăng nhập; chỉ hỗ trợ Google và Facebook OAuth. Không có xác minh số điện thoại: không được chặn hoạt động cộng đồng bằng `VerifiedPhoneGuard` hay bất kỳ điều kiện phone nào.
- Vai trò `DONOR`, `RECIPIENT`, `VOLUNTEER` cùng tồn tại trên một tài khoản; quyền quản trị tách biệt.
- Khu vực phục vụ gồm 22 quận/huyện TP.HCM (xem `AREA_CODES` trong `packages/contracts/src/enums.ts`); mỗi người dùng chọn tối đa 4. Không lưu/công khai vị trí nhà chính xác.
- Không xử lý thanh toán, đặt cọc hoặc phần trăm giao dịch.
- Chỉ hỗ trợ `HOUSEHOLD`, `CLOTHING`, `BOOKS`, `CHILDREN`, `DEVICES`; chặn tiền, thuốc, thực phẩm dễ hỏng và hàng nguy hiểm.
- REST API đặt dưới `/v1`; WebSocket chỉ dùng chat, read state và realtime notification.
- Backend là nguồn quyết định quyền, trạng thái giao dịch và điểm uy tín.
- TDD cho nghiệp vụ; mỗi task phải kết thúc bằng test xanh và commit riêng.
- Không đưa token, số điện thoại đầy đủ, địa chỉ chi tiết hoặc toàn bộ chat vào log.

## Amendments after Plan 1 shipped (2026-09-06)

Plan 1 đã hoàn thành và deploy. Ba ràng buộc bên dưới đã thay đổi sau khi
roadmap được viết; phần trên đã sửa cho khớp. Ghi lại ở đây để người đọc bản
plan cũ không cài đặt theo ràng buộc đã bị bỏ.

**1. Bỏ hoàn toàn đăng nhập/xác minh bằng số điện thoại.** Lý do: SMS gateway
tính phí. Chỉ còn Google và Facebook OAuth.

- `apps/api/src/modules/identity/verified-phone.guard.ts` VẪN CÒN trong repo và
  vẫn được export từ `identity.module.ts`, nhưng KHÔNG gắn vào route nào.
  **Không dùng guard này cho bất kỳ endpoint mới nào.** Không tài khoản nào có
  `phoneVerifiedAt`, nên gắn nó vào listings/chat sẽ trả 403 `PHONE_NOT_VERIFIED`
  cho 100% người dùng, vĩnh viễn, không có đường gỡ — trong khi unit test vẫn
  xanh vì test tự set `phoneVerified: true`.
- Các cột `encrypted_phone`, `phone_last4`, `phone_verified_at`,
  `phone_encryption_key_version` còn trong schema nhưng rỗng.
- `POST /v1/identity/sync-phone` còn tồn tại; chưa quyết định giữ hay xóa.

**2. Khu vực mở rộng từ 4 xã Hóc Môn ra 22 quận/huyện TP.HCM.** `BA_DIEM`,
`XUAN_THOI_SON`, `DONG_THANH` đã gộp vào `HOC_MON` bằng migration
`20260905000000_expand_areas_to_hcmc`.

- Enum PostgreSQL sắp theo THỨ TỰ KHAI BÁO, không theo alphabet.
- UI chọn khu vực phải xử lý 22 mục (nhóm hoặc tìm kiếm), không còn 4 checkbox.
- Mỗi người dùng vẫn chọn tối đa 4 khu vực (`MAX_AREAS`).

**3. PostgreSQL 17, không phải 18.** Supabase production chạy 17.6;
`infra/docker-compose.yml` và CI đã pin về 17. PG18 biểu diễn NOT NULL bằng
`pg_constraint` còn PG17 thì không, nên chạy lệch phiên bản sẽ báo "schema
drift" giả.

### Quyết định hạ tầng còn treo (chặn Plan 2 và Plan 3)

- **Lưu ảnh** (Plan 2 Task 2): chưa chọn Supabase Storage hay nhà cung cấp khác.
- **Chat realtime** (Plan 3 Task 3): Vercel không giữ được kết nối WebSocket; API
  chạy Render free tier, ngủ sau ~15 phút idle nên rớt kết nối. Cần chọn: nâng
  gói Render, dùng Supabase Realtime, hoặc tạm thời chat không realtime.
- **Redis** (Plan 3 và 4): production hiện KHÔNG có Redis, `REDIS_URL` là tùy
  chọn. BullMQ và Socket.IO Redis adapter chưa có chỗ chạy.

---

## Dependency order

1. [Foundation & Identity](./2026-08-04-foundation-identity.md)
2. [Listings & Discovery](./2026-08-04-listings-discovery.md)
3. [Gift Transactions, Chat & Notifications](./2026-08-04-gifting-chat.md)
4. [Volunteer Delivery, Reputation & Reviews](./2026-08-04-volunteer-reputation.md)
5. [Moderation, Admin & Production Readiness](./2026-08-04-moderation-production.md)

Mỗi plan tạo ra một lát cắt chạy được. Không bắt đầu plan sau khi plan trước chưa qua test, review và migration check.

## Repository map locked for all plans

```text
apps/
  api/
    prisma/
    src/
      common/
      modules/
    test/
  web/
    src/
      app/
      components/
      features/
      lib/
    tests/
packages/
  contracts/src/
infra/
  docker-compose.yml
  docker/
docs/
  runbooks/
  superpowers/
```

## Cross-plan release gates

- Plan 1: đăng nhập Google/Facebook OAuth, profile/role/area, public shell và health checks.
- Plan 2: đăng, upload ảnh, kiểm duyệt sơ bộ, tìm kiếm và khám phá theo 22 quận/huyện.
- Plan 3: gửi/chọn yêu cầu atomic, vòng đời giao dịch, chat realtime bền vững và notification.
- Plan 4: chuyến tình nguyện, đánh giá và điểm uy tín có audit event.
- Plan 5: báo cáo/kháng nghị/admin, hardening, backup/restore, E2E và closed-beta gate.

## Spec coverage map

- Vision, onboarding, public policies, multi-role profile and area selection → Plan 1 Tasks 1–6.
- Listing categories, image safety, risk moderation, search, area list/map and listing UI → Plan 2 Tasks 1–6.
- Receive request, donor selection, reservation, completion, internal chat, block/report entry and notifications → Plan 3 Tasks 1–6.
- Volunteer delivery, three-party chat, reviews, activity history and reputation → Plan 4 Tasks 1–6.
- Reports, moderation, appeals, admin RBAC/audit, content/reputation configuration and KPI dashboard → Plan 5 Tasks 1–3.
- Privacy, security, retention, deployment, observability, backup/restore, accessibility/load and closed-beta operations → Plan 5 Tasks 4–6.
- Explicitly deferred items remain in the design spec section “Ngoài phạm vi MVP” and have no implementation task.
