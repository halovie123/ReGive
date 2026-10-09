# WIP — Foundation hardening

Nhánh: `chore/foundation-hardening` (nằm trên `chore/remove-phone-verification`).

File này cập nhật **sau mỗi mục** để bàn giao được bất cứ lúc nào. Xoá khi
toàn bộ đã merge.

## Trạng thái

| # | Việc | Trạng thái |
| --- | --- | --- |
| 1 | Xoá scaffold `AppController`/`AppService` (`GET /v1` trả `Hello World!`) | ✅ xong |
| 2 | Security headers trong `next.config.ts` (clickjacking) | ✅ xong |
| 3 | `API_BASE_URL` thiếu ở production phải throw, không fallback localhost | ✅ xong |
| 4 | Thêm `apps/web/src/app/not-found.tsx` | ✅ xong |
| 5 | Thêm `GET /v1/ready` có `SELECT 1` | ✅ xong |
| 6 | Kiểm tra `--webpack`/`extensionAlias` còn cần không (contracts đã build ra `dist/`) | ✅ xong — bỏ, dùng Turbopack |
| 7 | Xoá SVG scaffold trong `apps/web/public/` | ✅ xong |
| 8 | _(phát sinh)_ Xoá 4 mã lỗi phone chết trong `PublicProblemCode` | ✅ xong |
| 9 | _(HANDOFF §4)_ API lộ `X-Powered-By: Express` | ✅ xong |
| 10 | _(HANDOFF §4)_ `LOCK_STALE_AFTER_MS` (300s) > `LOCK_WAIT_TIMEOUT_MS` (180s) | ✅ xong |
| 11 | _(HANDOFF §4)_ `resolveOrigin()` tin `x-forwarded-host` | ✅ xong |
| 12 | _(HANDOFF §4)_ Runbook auth hướng dẫn mua SMS gateway; runbook local-dev sai migration | ✅ xong |
| 13 | _(HANDOFF §4)_ README của `apps/api` và `apps/web` vẫn là bản scaffold | ✅ xong |
| 14 | _(HANDOFF §4)_ `MIN_AREAS`/`MAX_AREAS` trùng ở 2 nơi, không test nào đối chiếu | ✅ xong |
| 15 | _(HANDOFF §4)_ Unhandled rejection ở `onboarding-form.tsx` mỗi lần đăng ký thành công | ✅ xong |
| 16 | _(HANDOFF §4)_ `(app)/loading.tsx`, `(app)/error.tsx` không có test | ✅ xong |
| 17 | _(HANDOFF §4)_ Đổi `orderBy` areas sang `desc` không đỏ test nào | ✅ xong |
| 18 | _(phát sinh)_ Typecheck/lint API đỏ sau mục 1/5/8; Jest e2e hỏng vì worktree lồng | ✅ xong |
| 19 | _(phát sinh, nghiêm trọng)_ Bảng không có RLS → anon key đọc/sửa được qua Data API của Supabase | ✅ xong — đã đóng trên production 2026-10-05 |
| 20 | _(phát sinh)_ Supabase free tự dừng project khi ít hoạt động → workflow ping `/v1/ready` | ✅ xong |

Ký hiệu: ⬜ chưa · 🔄 đang làm · ✅ xong (test xanh) · ⛔ bỏ, có lý do

## Baseline

Đo trên `2245459` trước khi bắt đầu:

```
contracts  16 passed
api        49 unit + 8 e2e passed (4 skipped)
web        53 passed
```

Hiện tại (sau cả 18 mục):

```
contracts  16 passed
api        52 unit + 14 e2e passed (5 skipped — cần DB)
api DB     5 passed (RUN_DATABASE_TESTS=true, Postgres 17 local)
web        73 passed
web e2e    13 passed, 2 skipped (cần OAuth thật)
api smoke  OK
typecheck, lint (0 error), build: xanh
```

Lệnh chạy lại:

```bash
corepack pnpm --filter @buy-nothing/contracts test
corepack pnpm --filter api test
corepack pnpm --filter web test
corepack pnpm -r typecheck && corepack pnpm -r lint && corepack pnpm -r build
```

`pnpm` không có trong PATH máy này — dùng `corepack pnpm` (pnpm 11.20.0 nằm
trong corepack cache).

## Nhật ký

### ✅ Mục 1 — xoá scaffold `Hello World!`

`GET /v1` trả `"Hello World!"` trên API production, do `AppController` của
scaffold NestJS chưa bao giờ bị xoá.

Đỏ→xanh đã chứng minh: thêm test `serves nothing at the API root` vào
`test/health.e2e-spec.ts` → **fail** (nhận 200 thay vì 404) → xoá
`app.controller.ts`, `app.service.ts`, `app.controller.spec.ts` → **pass**.

`AppModule` giờ chỉ còn `HealthController`.

### ✅ Mục 5 — `GET /v1/ready`

`/v1/health` trả `{status:'ok'}` cứng, không chạm DB → database chết vẫn báo
khoẻ, Render không có cách nào biết mà restart.

Tách rõ hai vai trò:

- `/v1/health` = **liveness**, cố tình không chạm gì. DB chậm không được làm
  process bị giết và restart, việc đó chỉ làm sự cố nặng thêm.
- `/v1/ready` = **readiness**, chạy `SELECT 1`. Lỗi driver bị nuốt có chủ ý —
  endpoint này không cần đăng nhập, mà lỗi kết nối thô lộ host/port/user của
  database. Trả 503 `NOT_READY` với thông điệp tiếng Việt trung tính.

Đỏ→xanh: 4 test unit mới trong `src/health.controller.spec.ts` fail trước khi
implement (3 fail / 1 pass), pass hết sau. Thêm 4 test e2e phủ cả trường hợp
DB chết mà `/health` vẫn phải trả 200.

`AppModule` giờ import `PrismaModule`; `health.e2e-spec.ts` override
`PrismaService` bằng stub nên vẫn chạy không cần database.

### ✅ Mục 7 — xoá SVG scaffold

`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg` — không file
nào được tham chiếu (đã grep `apps/web/src` và `apps/web/tests`).
`public/` giờ chỉ còn `icon.svg`, được `app/manifest.ts` dùng thật.

### ✅ Mục 8 — mã lỗi phone chết (phát sinh, không có trong kế hoạch ban đầu)

`PublicProblemCode` vẫn còn `PHONE_NOT_VERIFIED`, `PHONE_NOT_CONFIRMED`,
`PHONE_INVALID`, `IDENTITY_PROVIDER_UNAVAILABLE` sau khi gỡ phone auth. Một
thành viên union chết là lời mời dựng lại tính năng đã xoá. Đã bỏ cả 4, thêm
`NOT_READY`.

### ✅ Mục 2 — security headers

`next.config.ts` không có `headers()` nào → mọi trang đã đăng nhập nhúng
iframe được (clickjacking nút đăng xuất / đổi vai trò).

Thêm một rule `/:path*` duy nhất: `X-Frame-Options: DENY`, CSP
`frame-ancestors 'none'`, `nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, HSTS 2 năm, `Permissions-Policy` chặn
geolocation/camera/micro/payment/usb. Thêm `poweredByHeader: false`.

CSP **cố ý chỉ có `frame-ancestors`**: một `script-src` đầy đủ cần nonce theo
request cho script inline của Next, sai một chút là trắng trang.

Đỏ→xanh: `tests/site/security-headers.test.tsx` 5 fail → 5 pass. Đã kiểm thêm
trên bản build thật (`next start` + `curl -I`): header có ở `/` và
`/tro-giup`, `X-Powered-By` biến mất.

### ✅ Mục 6 — bỏ `--webpack` / `extensionAlias`

Lý do cũ (contracts xuất `src/*.ts` với specifier `.js` không có trên đĩa)
không còn: contracts giờ build ra `dist/*.js` thật. Đã xoá khối `webpack()`
và cờ `--webpack` ở `dev`, `build`, Playwright `webServer`.

Kiểm chứng: `next build` (Turbopack) xanh, đủ 16 route; Playwright (`next dev`
Turbopack) 13 pass / 2 skip — khớp baseline.

### ✅ Mục 4 — `not-found.tsx`

Người chưa đăng nhập không bao giờ thấy 404 (proxy đẩy về `/login`), nên đây
là trang cho người **đã** đăng nhập gõ sai URL. Nút chính về `/trang-chu`,
phụ về `/tro-giup`; không dùng `PublicHeader` vì nút "Đăng nhập" sai ngữ
cảnh. Đỏ→xanh: 3 test trong `tests/site/not-found.test.tsx`.

### ✅ Mục 3 — `API_BASE_URL` thiếu ở production

Thêm `ApiConfigurationError`; `apiBaseUrl()` ném nó khi thiếu biến và
`NODE_ENV=production`, dev vẫn fallback localhost.

Hai cái bẫy phải xử lý thêm, nếu không throw vẫn bị nuốt:

1. `apiBaseUrl()` được gọi **bên trong** `try` của `fetch` → lỗi bị đổi thành
   `API_UNREACHABLE`. Đã chuyển việc dựng URL ra trước `try`.
2. `safeGetMe()` nuốt mọi lỗi → người dùng trông như chưa đăng nhập. Giờ nó
   ném lại riêng `ApiConfigurationError`; lỗi API (ngủ/timeout/401) vẫn trả
   `null` như cũ để bảo vệ OAuth callback.

Đỏ→xanh: 4 test mới trong `tests/lib/server-fetch.test.tsx` (2 fail; sau lần
sửa đầu vẫn fail vì bẫy 1 — chính test đã bắt được nó).

### ✅ Mục 9 — `X-Powered-By: Express`

`app.disable('x-powered-by')` trong `main.ts`. Không e2e nào boot `main.ts`,
nên assertion đặt trong `scripts/smoke-health.mjs` (chạy `dist/src/main.js`
thật). Đỏ→xanh: smoke fail "advertises X-Powered-By: Express" → OK.

### ✅ Mục 10 — lock của `ensure-contracts-built.mjs`

Stale 300s → 120s, kèm comment về bất biến stale < wait. Kiểm: tạo
`.build-lock` 200s tuổi → script thu hồi ngay và build trong 1,6s.

### ✅ Mục 11 — `resolveOrigin()`

`NEXT_PUBLIC_SITE_URL` (nếu có) luôn thắng; nếu không thì chỉ dùng `Host`,
**không bao giờ** đọc `x-forwarded-host`. Không bắt buộc biến này ở
production để tránh làm hỏng OAuth nếu Vercel chưa set — nhưng runbook và
`.env.example` giờ ghi rõ nên set. Đỏ→xanh: 3 test trong
`tests/auth/oauth-origin.test.tsx` (2 fail với `attacker.example`).

### ✅ Mục 12 — runbook

- `auth-provider-setup.md`: mục "Enable the phone (SMS OTP) provider" thay
  bằng "Keep the phone provider disabled" (giải thích rủi ro SMS-pumping);
  luồng xác minh, số test fixme, `NEXT_PUBLIC_SITE_URL`/`API_BASE_URL` cập
  nhật theo code hiện tại.
- `local-development.md`: liệt kê đủ 4 migration và migration nào seed 22
  quận (trước ghi sai là migration đầu).

### ✅ Mục 13 — README

Viết lại `apps/api/README.md` (bảng route thật, lệnh, bẫy) và
`apps/web/README.md` (cấu trúc, lệnh, env production).

### ✅ Mục 14 — `MIN_AREAS`/`MAX_AREAS`

Export hai hằng số khỏi `profiles.service.ts`; `test/area-limits.e2e-spec.ts`
đối chiếu với contracts và kiểm schema thật sự chặn MAX+1. Chứng minh: đổi
service `MAX_AREAS` thành 5 → "Expected: 4, Received: 5".

### ✅ Mục 15 — unhandled rejection ở form onboarding

Đã đọc mã Next 16 (`server-action-reducer.js`): action redirect thì promise
bị **reject** với lỗi `NEXT_REDIRECT`, dành cho `RedirectBoundary` — nhưng
boundary chỉ bắt được lỗi đi qua React. Gọi trong `handleSubmit` của
react-hook-form thì thành unhandled rejection. Sửa: gọi action trong
`startTransition`, nút bấm dùng `isPending`. Đỏ→xanh: test mới trong
`tests/onboarding/onboarding.test.tsx` (Vitest báo đúng "Unhandled
Rejection" trước khi sửa).

### ✅ Mục 16 — test cho loading/error

`tests/home/app-shell-states.test.tsx` (4 test). Đã kiểm: xoá
`loading.tsx` → bộ test đỏ.

### ✅ Mục 17 — thứ tự areas trên Postgres thật

Test mới trong `profiles-db.e2e-spec.ts` chọn `HOC_MON, QUAN_10, QUAN_8`,
kỳ vọng `QUAN_8, QUAN_10, HOC_MON` — khác thứ tự nhập, chữ cái và đảo
ngược. Chạy trên Postgres 17 local: 5/5 pass; đổi `orderBy` sang `desc` →
đúng 1 test đỏ.

### ✅ Mục 18 — sửa phát sinh

- `api-exception.filter.spec.ts` vẫn dùng `PHONE_NOT_VERIFIED` (đã xoá ở mục
  8) → typecheck đỏ dù jest xanh. Đổi sang `ACCOUNT_SUSPENDED`.
- `health.e2e-spec.ts`: `createNestApplication<App>()` sai generic.
- `health.controller.spec.ts`: 3 lỗi lint; test "không lộ lỗi DB" từng có
  thể pass vô nghĩa (`JSON.stringify(Error)` là `{}`), giờ kiểm đúng
  `getResponse()` — phần thực sự gửi ra ngoài.
- `test/jest-e2e.json` có `rootDir` là gốc repo nên Jest quét cả
  `.kilo/worktrees/*` → "Haste module map" trùng `@buy-nothing/contracts`,
  mọi e2e import contracts (kể cả `foundation-gate`) không chạy được trên
  máy này. Thêm `roots: ["<rootDir>/apps/api/test"]`.

### ✅ Mục 19 — RLS (nghiêm trọng)

Supabase phục vụ mọi bảng trong schema `public` qua Data API (PostgREST),
xác thực bằng **anon key — công khai, nằm trong bundle web**. Quyền mặc định
của Supabase cấp ALL cho `anon`/`authenticated` trên mọi bảng migration tạo,
và không bảng nào bật RLS. Audit trước chỉ tấn công API NestJS, không thử
đường này.

Tái hiện trên Postgres 17 với quyền mặc định giống Supabase: dưới vai trò
`anon`, `SELECT` trên `users` trả về dữ liệu và `UPDATE` đổi được một tài
khoản sang `SUSPENDED`.

**Xác nhận trên production (2026-10-05, sau khi resume):** chỉ với anon key,
`GET /rest/v1/areas` trả dữ liệu; `GET /rest/v1/users` (limit=0, chỉ đếm)
trả `Content-Range: */2`; `PATCH /rest/v1/users` nhắm id không tồn tại trả
204 → có quyền ghi. Bản web đang chạy (`main`) không dùng Data API, vai trò
`postgres` của API là chủ mọi bảng và có `BYPASSRLS`.

**Đã đóng trên production cùng ngày** (chủ sản phẩm đồng ý): chạy nguyên văn
SQL của migration `20260907000000` trong một transaction. Sau đó 3 bài thử
trên đều trả 401 `permission denied`; web/API vẫn 200, `/v1/me` không token
vẫn 401. Migration chưa được ghi vào `_prisma_migrations`; `migrate deploy`
lúc merge sẽ chạy lại nó, an toàn vì mọi lệnh đều idempotent.

Kiểm tra toàn vẹn (chỉ metadata): 2 user đều `ACTIVE`, 22 khu vực đều bật,
thay đổi cuối của mọi bảng là 2026-09-04. **Không loại trừ được**: `updated_at`
do Prisma ghi phía ứng dụng nên sửa qua Data API không làm nó đổi, và việc
đọc không để lại dấu vết trong dữ liệu. Phạm vi lộ nếu có: tên hiển thị, bio,
vai trò, khu vực, provider subject của 2 tài khoản; email/mật khẩu nằm ở
schema `auth`, không bị mở.

Sửa: migration `20260907000000_enable_row_level_security` bật RLS (không
policy) trên mọi bảng hiện có, thu hồi quyền của `anon`/`authenticated` kể cả
quyền mặc định cho bảng tương lai (chỉ khi vai trò tồn tại). API kết nối bằng
chủ bảng nên không bị RLS chặn — bộ test DB chạy xanh trên database đã bật RLS.
Web không dùng Data API (đã grep: không có `.from(`/`.rpc(`).

Chống tái phát: `test/row-level-security-db.e2e-spec.ts` fail nếu bất kỳ bảng
nào trong `public` thiếu RLS hoặc `anon` còn quyền. CI chạy
`prisma/ci/emulate-supabase-roles.sql` trước migration để kiểm trên quyền
giống production. Đỏ→xanh: 2 fail khi thiếu migration, 2 pass khi có.

### ✅ Mục 20 — chống Supabase tự dừng project

Project bị dừng vì gói free dừng project ít hoạt động database trong một
tuần → đăng nhập và mọi trang sau đăng nhập chết. `/v1/health` vẫn báo 200
(liveness không chạm DB) — đúng lý do mục 5 thêm `/v1/ready`.

`.github/workflows/keep-alive.yml`: 6 giờ/lần gọi `/v1/ready` (chạy
`SELECT 1`, đồng thời đánh thức Render). Run fail = API hoặc DB chết, GitHub
gửi email cho chủ repo. Chỉ chạy sau khi merge vào `main` và `/v1/ready` đã
deploy; GitHub tắt workflow định kỳ sau 60 ngày repo không có hoạt động.

## Việc còn lại của người dùng (không phải của agent)

0. ~~Bấm "Resume project" trên Supabase~~ **Đã làm 2026-10-05.**

1. Merge `chore/remove-phone-verification` vào `main` → deploy.
2. **Rồi mới** `corepack pnpm --filter api exec prisma migrate deploy`.
   Đã kiểm tra: migration **chưa** chạy, production nguyên vẹn; bảng
   `_prisma_migrations` khoẻ (dòng lỗi cũ của `expand_areas_to_hcmc` đã được
   `resolve --rolled-back` nên không chặn).
3. Rotate `SUPABASE_SERVICE_ROLE_KEY` + mật khẩu DB trong Supabase, rồi xoá
   `SUPABASE_SERVICE_ROLE_KEY` và `PII_ENCRYPTION_KEY_V1` khỏi Render.
4. ~~Kiểm tra `API_BASE_URL` trên Vercel~~ **Đã xác nhận (2026-10-04)**: có cho
   Production và Preview. Giá trị phải kết thúc bằng `/v1` (ví dụ
   `https://<api>.onrender.com/v1`). Từ mục 3, thiếu biến này ở production
   sẽ **ném lỗi** (cố ý) thay vì âm thầm gọi localhost.
5. Thêm `NEXT_PUBLIC_SITE_URL=https://<domain-thật>` trên Vercel, **chỉ chọn
   Production**. Nếu chọn cả Preview, đăng nhập trên bản preview sẽ quay về
   domain production. Không set thì OAuth vẫn chạy (dùng `Host`). Biến
   `NEXT_PUBLIC_*` được nhúng lúc build nên phải redeploy sau khi thêm.
6. Set `NODE_ENV=production` rõ ràng trên Render (HANDOFF §4, bảo mật mức
   thấp).
