# Bàn giao — ReGive (2026-09-05)

Ghi cho người/agent tiếp theo (Codex). Đọc hết phần **1** trước khi làm gì.

---

## 1. VIỆC GẤP NHẤT: có thay đổi chưa commit trên cây làm việc

Tôi sửa xong 7 file, **đã chạy typecheck + lint + test (42/42 pass)**, nhưng **không commit được**: `git` không có trong PATH của PowerShell trên máy này (trước đó tôi dùng qua môi trường Bash, môi trường đó đã bị gỡ khỏi phiên). Không tìm thấy `git.exe` ở `C:\Program Files\Git`, `C:\msys64`.

**Việc đầu tiên cần làm: commit số thay đổi này.** Nếu bạn có git chạy được:

```bash
cd T:/@haloviek18/TTDoanhNghiep/BuyNothing/ReGive
git status                 # xác nhận đúng 7 file dưới đây
git add apps/web/src
git commit -F docs/handoff-commit-msg.txt   # message đã soạn sẵn, xem mục 1.2
git push origin main       # Vercel sẽ tự deploy lại
```

### 1.1 Bảy file đã sửa (chưa commit)

| File | Thay đổi |
|---|---|
| `apps/web/src/lib/api/server-fetch.ts` | Thêm `AbortSignal.timeout(60_000)` cho `apiFetch`; bọc `fetch` trong try/catch; thêm 2 hằng `TIMEOUT_PROBLEM`, `UNREACHABLE_PROBLEM` |
| `apps/web/src/app/(app)/loading.tsx` | **File mới** — màn hình chờ, chống trắng màn hình 42 giây |
| `apps/web/src/app/(app)/error.tsx` | **File mới** — error boundary tiếng Việt cho vùng đã đăng nhập |
| `apps/web/src/app/(app)/layout.tsx` | Bọc try/catch quanh `apiFetch` trong `updateActiveRoleAction` |
| `apps/web/src/features/auth/auth-actions.ts` | `getMe()` → `safeGetMe()` trong `completeSignInRedirect` (đổi cả dòng import) |
| `apps/web/src/app/(app)/trang-chu/page.tsx` | Sửa comment sai (nói "phone verified" — đã bỏ; và khẳng định sai rằng layout luôn bảo vệ) |
| `apps/web/src/styles/regive-app.css` | Thêm CSS `.app-loading*` ở cuối file |

### 1.2 Message commit đã soạn

Nằm ở `C:\Users\LENOVO\AppData\Local\Temp\claude\t---haloviek18-TTDoanhNghiep-BuyNothing-ReGive\384b88bf-8c27-4a91-89f8-a0475e778a63\scratchpad\commitmsg.txt`. Nếu file tạm đó mất, dùng bản rút gọn:

```
fix: survive a sleeping API instead of a blank tab or an English crash

Render free tier sleeps after ~15 min idle; cold start measured at 42.5s.
Anonymous visitors are unaffected (public site is statically prerendered
at Vercel's edge), but signed-in members hit a blank white tab.

- apiFetch: no timeout -> bounded at 60s, typed Vietnamese errors
- added (app)/loading.tsx: no Suspense boundary existed, so Next could
  not flush any HTML while the layout awaited /v1/me
- completeSignInRedirect used throwing getMe() in the OAuth callback
  (no try/catch, no boundary) -> a new user's first screen after Google
  consent could be Next's raw English error, with the single-use code
  already spent. Now safeGetMe().
- role-switcher Server Action called apiFetch bare -> one failure
  replaced the whole app shell. Now caught.
- added (app)/error.tsx: Next skips unchanged layout segments on
  client-side navigation, so the layout's error state never rendered on
  a soft nav failure.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

## 2. Trạng thái sản phẩm

**Đang chạy thật, có người dùng thật.**

| Thành phần | Địa chỉ | Trạng thái |
|---|---|---|
| Web | https://re-give-web.vercel.app | Sống, auto-deploy khi push `main` |
| API | https://regive-llw3.onrender.com | Sống, Render **free tier** (ngủ sau ~15 phút) |
| Database | Supabase Postgres (pooler `aws-0-ap-southeast-1`, cổng 5432) | 3 migration đã áp, 22 khu vực, 2 người dùng thật |
| Auth | Supabase Auth — Google + Facebook | Hoạt động (đã có người đăng nhập thành công) |

Đã xây xong (nền móng): đăng nhập OAuth, hồ sơ, 3 vai trò, 22 quận/huyện TP.HCM, 6 trang chính sách công khai, app shell.

**Chưa xây:** đăng món đồ, khám phá/tìm kiếm, gửi yêu cầu nhận, chat. Nút "Đăng món đồ mới" cố tình bị vô hiệu hoá với chữ "Sắp ra mắt" — **đây không phải bug**.

### Bí mật / thông tin nhạy cảm
- `apps/api/.env` (đã gitignore) chứa credential Supabase **thật**. Đừng in ra, đừng commit.
- Chủ dự án đã dán `service_role key` + mật khẩu DB vào lịch sử chat → **nên rotate cả hai trong Supabase Dashboard**, rồi cập nhật lại biến môi trường trên Render.

---

## 3. Audit: đã làm được 3/8 mảng

Chạy audit đa agent. **3 mảng xong, 3 mảng chết vì chạm giới hạn tài khoản (reset 14:20 giờ Bangkok), 2 mảng chưa chạy.**

### ✅ 3.1 Bảo mật xác thực — CHẮC CHẮN, không cần sửa

Đã tấn công thật API live bằng 22 kiểu, tất cả bị chặn đúng: `alg:none`, HS256 (algorithm confusion), ES256 ký sai khoá, token hết hạn, thiếu `session_id`, header rỗng/sai scheme. Vượt allowlist proxy (`/trang-chu/`, `//trang-chu`, `/TRANG-CHU`, `/trang-chu%2f`, `/an-toan/x`) đều bị đẩy về `/login`.

Xác nhận đúng: thuật toán JWT ghim `ES256/RS256`; kiểm issuer + audience; JWKS cache đúng (không kẹt khi xoay khoá); mọi guard web dùng `getUser()` chứ không phải `getSession()`; cookie phiên được sao khi redirect; token không tới trình duyệt/log; lỗi đồng nhất 401 không lộ manh mối.

**Một bẫy tiềm ẩn cần biết (chưa gây hại):** `VerifiedPhoneGuard` vẫn còn trong code. Vì đã bỏ xác minh SĐT, **không ai có thể có `phoneVerifiedAt`**. Ngày nào gắn guard này vào endpoint mới (ví dụ khi xây chức năng đăng đồ) → **100% người dùng bị 403 vĩnh viễn**, và unit test vẫn xanh vì test tự set `phoneVerified: true`. Nên xoá guard, hoặc thêm test khẳng định nó được gắn vào 0 route.

### ✅ 3.2 Sẵn sàng production — đã sửa phần nghiêm trọng

Cold start **đo được 42,5 giây** (TTFB; connect chỉ 0,12s → toàn bộ là thời gian Render khởi động container). Đã sửa (mục 1). **Còn lại chưa sửa:**

- **Không có security header** (`next.config.ts` thiếu `headers()`): thiếu `X-Frame-Options`/CSP `frame-ancestors`, `nosniff`, `Referrer-Policy`. Trang đã đăng nhập có thể bị nhúng iframe → clickjacking vào nút đăng xuất và đổi vai trò. **Nên sửa.**
- **`docs/runbooks/auth-provider-setup.md` sai hoàn toàn phần SMS**: vẫn hướng dẫn mua SMS gateway (Twilio), vẫn trỏ tới `apps/web/src/lib/phone.ts` (file đã xoá), vẫn nói `/onboarding/phone` (route đã xoá), nói "3 test.fixme" (thực tế 2). Nguy hiểm thật: người sau sẽ mua gateway vô ích và bật provider SMS → thành mục tiêu SMS-pumping.
- **`docs/runbooks/local-development.md:89-91`** vẫn ghi 4 khu vực Hóc Môn, chưa nhắc migration thứ 3.
- **`/v1/health` trả `{status:'ok'}` cứng**, không chạm DB → database chết vẫn báo khoẻ, Render không phát hiện. Nên thêm `/v1/ready` có `SELECT 1`.
- `scripts/ensure-contracts-built.mjs`: `LOCK_WAIT_TIMEOUT_MS` (180s) **nhỏ hơn** `LOCK_STALE_AFTER_MS` (300s) → nếu build bị SIGKILL khi đang giữ lock, lần build kế tiếp fail chắc chắn 1 lần. Đổi stale xuống 120s.
- `API_BASE_URL` sai/thiếu sẽ fail âm thầm (fallback về localhost, `safeGetMe` nuốt lỗi). Nên throw khi thiếu ở production.
- `x-powered-by: Express` còn lộ trên API.
- File rác 0 byte tên `git` ở gốc repo — xoá trước khi ai đó commit nhầm.

### ✅ 3.3 Runtime web — đã sửa F1/F2/F3/F5, còn F4/F6/F7

Đã dựng **ma trận redirect đầy đủ**: xác nhận **không còn vòng lặp vô hạn** ở mọi tổ hợp trạng thái (không phiên / có phiên+chưa hồ sơ / có hồ sơ / `/v1/me` lỗi / `/v1/me` 401 / phiên bị thu hồi giữa chừng).

**Còn lại chưa sửa:**
- **F4 (important)** — `apps/web/src/app/(auth)/login/page.tsx` **không đọc `searchParams`**, nên 4 chỗ redirect về `/login?error=...` (OAuth bị từ chối, thiếu code, đổi code thất bại) đều **mất sạch thông báo lỗi**. Người dùng từ chối cấp quyền Facebook → quay về trang login trắng trơn, không biết vì sao, bấm lại → lặp vô tận. Sửa: nhận `searchParams`, render `StatusState` map mã lỗi sang tiếng Việt (đừng in thẳng `error_description` của provider).
- **F6 (minor)** — `onboarding-form.tsx:49-57`: mỗi lần đăng ký thành công đều tạo **unhandled promise rejection** (Next reject action promise khi redirect; react-hook-form ném lại). Người dùng không bị ảnh hưởng, nhưng mọi log lỗi sẽ có false positive ở đúng luồng thành công.
- **F7 (minor)** — không có `not-found.tsx`: người đã đăng nhập gõ URL sai thấy trang 404 tiếng Anh mặc định, không có đường về.
- **F9 (minor)** — `resolveOrigin()` tin `x-forwarded-host`; chỉ có allowlist của Supabase chặn. Nên ưu tiên `NEXT_PUBLIC_SITE_URL`.

### ❌ 3.4 Ba mảng CHẾT giữa chừng — cần chạy lại

Chết vì `429 rate_limit` (reset 14:20 Bangkok), **không phải vì lỗi nội dung**:

1. **Dữ liệu & migration** ← **QUAN TRỌNG NHẤT, làm trước**
2. **API correctness** (concurrency, khoá hàng, enum ordering)
3. **Trải nghiệm/accessibility**

### ⬜ 3.5 Hai mảng chưa từng chạy
4. **Mã hoá PII** (AES-256-GCM, quản lý khoá)
5. **Chất lượng test** (test nào giả, fake nào đã lệch khỏi Postgres thật)

---

## 4. Câu hỏi CRITICAL chưa có lời giải — ưu tiên số 1

Migration `apps/api/prisma/migrations/20260905000000_expand_areas_to_hcmc/migration.sql` **đã fail giữa chừng khi áp lên production** (Postgres 42804: không đổi được kiểu `areas.code` khi `user_areas.area_code` còn kiểu cũ và khoá ngoại đang trỏ vào).

Tôi đã: sao lưu dữ liệu → sửa tay production trong transaction (drop FK → đổi kiểu 2 cột → gắn lại FK → drop type cũ → seed 22 quận) → `prisma migrate resolve --applied`. Production hiện **đúng** (22 khu vực, enum cũ đã xoá, FK khôi phục, 2 user giữ nguyên `HOC_MON`). `prisma migrate status` báo "up to date".

Sau đó tôi **đã sửa file migration** (thêm `DROP CONSTRAINT` trước khi đổi kiểu, `ADD CONSTRAINT` sau).

**Chưa ai kiểm chứng: chạy file migration đã sửa đó trên một database TRỐNG HOÀN TOÀN thì có ra đúng schema mà production đang có không?**

Vì production được sửa tay, nếu file migration còn lệch thì **CI và mọi môi trường mới sẽ khác production một cách âm thầm** — loại lỗi nguy hiểm nhất. Cách kiểm:

```bash
docker compose -f infra/docker-compose.yml up -d
# tạo DB trống, chạy prisma migrate deploy, rồi so sánh schema với production:
#   - danh sách + thứ tự khai báo enum area_code (Postgres sort theo thứ tự khai báo, không phải alphabet)
#   - các constraint/index của areas và user_areas (đổi kiểu cột có thể âm thầm mất index)
#   - định nghĩa FK user_areas_area_code_fkey (ON DELETE RESTRICT ON UPDATE CASCADE)
```

Bản sao lưu dữ liệu areas/user_areas trước khi migrate nằm ở scratchpad: `regive-areas-backup.json`.

---

## 5. Việc còn lại theo thứ tự tôi khuyến nghị

1. **Commit + push 7 file ở mục 1** (đang treo, đã test xong)
2. **Trả lời câu hỏi CRITICAL ở mục 4** (migration có tái lập được không)
3. Chạy lại 3 mảng audit chết + 2 mảng chưa chạy (mục 3.4, 3.5)
4. Sửa F4 (mất thông báo lỗi đăng nhập) + security header + 2 runbook sai
5. Xử lý bẫy `VerifiedPhoneGuard` (mục 3.1)
6. Chỉ sau khi nền móng sạch → mới xây chức năng tặng/nhận (kế hoạch riêng: `docs/superpowers/plans/2026-08-04-listings-discovery.md`, `gifting-chat.md`)

---

## 6. Lưu ý môi trường (rất dễ mất thời gian nếu không biết)

- **`pnpm` KHÔNG có trong PATH.** Dùng `corepack pnpm`. Script cấp gốc (`pnpm lint/test/build`) **sẽ fail** vì chúng gọi `pnpm` trần bên trong. Chạy theo từng package:
  `corepack pnpm --filter api <script>` / `--filter web` / `--filter @buy-nothing/contracts`
- **`git` không có trong PowerShell** trên máy này (chỉ có trong môi trường Bash). Cần tìm/ cài git để commit.
- Chạy `prisma` cần nạp env trước: `cd apps/api; set -a; source .env; set +a` (bash) hoặc tương đương.
- Đổi `schema.prisma` xong **phải chạy `prisma generate`**, nếu không typecheck sẽ báo lỗi enum khó hiểu.
- Docker Desktop hay tắt; `docker compose -f infra/docker-compose.yml up -d` để có Postgres local.
- Test web đôi khi timeout worker do tải máy — chạy lại là xanh, không phải lỗi thật.
- **Bẫy đã cắn 2 lần:** cột enum Postgres sort theo **thứ tự khai báo**, không phải alphabet. Sau khi mở rộng 22 quận, `HOC_MON` nằm ở vị trí 17 chứ không phải 0. Mọi assertion về thứ tự đều phải kiểm lại.

---

## 7. Bài học từ phiên này (đáng đọc)

- **Test xanh không có nghĩa là chạy được.** API từng không khởi động nổi ở bất kỳ chế độ nào trong khi 79 test vẫn xanh — vì test dùng ts-jest có `moduleNameMapper` che mất lỗi resolve module thật. Chỉ phát hiện khi có người bấm chạy thật. Nay đã có `pnpm --filter api smoke` (build + khởi động server thật + gọi `/v1/health`) trong CI.
- **Ảnh chụp bắt được lỗi mà test không bắt được.** Logo bản đầu render ra một cục mờ vô nghĩa nhưng mọi test đều xanh.
- **Đừng tin báo cáo agent, hãy kiểm lại.** Workflow audit đầu tiên báo "0 lỗi" — thực chất 90/92 agent đã chết vì rate limit và logic script của tôi đánh dấu nhầm 27 phát hiện chưa kiểm chứng thành "đã bác bỏ".
- Migration đụng enum + khoá ngoại trên Postgres: **luôn drop FK trước khi đổi kiểu**, và sao lưu trước khi chạy trên dữ liệu thật.
