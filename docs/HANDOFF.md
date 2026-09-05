# Bàn giao — ReGive

Cập nhật: 2026-09-05. Ghi cho người/agent tiếp theo.

---

## 1. Trạng thái sản phẩm

**Đang chạy thật, có người dùng thật.**

| Thành phần | Địa chỉ | Ghi chú |
|---|---|---|
| Web | https://re-give-web.vercel.app | Vercel, auto-deploy khi push `main` |
| API | https://regive-llw3.onrender.com | Render **free tier** — ngủ sau ~15 phút, khởi động lại mất ~42s |
| Database | Supabase Postgres **17.6** | 3 migration đã áp, 22 khu vực, có người dùng thật |
| Auth | Supabase Auth — Google + Facebook | Hoạt động |

**Đã xây (nền móng):** đăng nhập OAuth, hồ sơ, 3 vai trò, 22 quận/huyện TP.HCM, 6 trang chính sách công khai, app shell.

**Chưa xây:** đăng món đồ, khám phá/tìm kiếm, gửi yêu cầu nhận, chat. Nút "Đăng món đồ mới" cố tình vô hiệu hoá với chữ "Sắp ra mắt" — **không phải bug**. Kế hoạch có sẵn ở `docs/superpowers/plans/2026-08-04-listings-discovery.md` và `gifting-chat.md`.

---

## 2. Audit nền móng: đã xong cả 8 mảng

Mỗi mảng do một agent độc lập soi, có tấn công/đo đạc thật chứ không chỉ đọc code.

| Mảng | Kết quả |
|---|---|
| Bảo mật xác thực | ✅ Chắc chắn — 22 kiểu tấn công thật vào API live đều bị chặn đúng |
| API correctness | ✅ Sạch — khoá đồng thời đúng, không deadlock, bất biến được giữ |
| Dữ liệu & migration | ✅ Không drift — migration tái lập đúng production trên DB trống |
| Mã hoá PII | ✅ AES-256-GCM triển khai đúng, không rò rỉ, không secret nào trong git |
| Runtime web | ✅ Không còn vòng lặp redirect ở mọi tổ hợp trạng thái |
| Sẵn sàng production | ⚠️ Đã sửa lỗi nặng nhất, còn vài việc (mục 4) |
| Trải nghiệm & tiếp cận | ⚠️ Đã sửa lỗi tương phản + screen reader, còn vài việc |
| Chất lượng test | ⚠️ Đã vá 2/3 lỗ hổng, còn 1 (mục 4) |

### Đã sửa trong đợt này
- **Màn hình trắng 42 giây** khi API ngủ dậy: thêm timeout 60s cho `apiFetch`, thêm `(app)/loading.tsx`, thêm `(app)/error.tsx`.
- **Lỗi Critical**: OAuth callback dùng `getMe()` ném lỗi → người dùng **mới** có thể mất luôn lần đăng nhập đầu (mã OAuth dùng một lần đã tiêu). Đổi sang `safeGetMe()`.
- **Tương phản trượt WCAG AA**: chữ trắng trên nút xanh chỉ 2,62:1 → tách token `--regive-green-text` (4,6:1), giữ xanh thương hiệu cho hình trang trí.
- **`<select>` đổi vai trò không có tên** với screen reader (`display:none` xoá khỏi cây accessibility) → dùng kỹ thuật clip-path.
- **Lỗi đăng nhập OAuth bị vứt đi** → hiện thông báo tiếng Việt.
- **Postgres lệch phiên bản**: test chạy 18, production chạy 17.6 → pin cả docker-compose và CI về 17.
- Giới hạn 4 khu vực: thêm bộ đếm trực tiếp trong form + backstop ở service.
- Nội dung lỗi thời: "tên xã" → "quận/huyện", link trong bài viết có gạch chân.

---

## 3. Bẫy quan trọng cần biết trước khi sửa gì

1. **`VerifiedPhoneGuard` là bẫy khoá tài khoản.** Vì đã bỏ xác minh SĐT, không ai có thể có `phoneVerifiedAt`. Gắn guard này vào endpoint mới (rất dễ xảy ra khi xây chức năng đăng đồ) → **100% người dùng bị 403 vĩnh viễn**, và unit test vẫn xanh vì test tự set `phoneVerified: true`. Nên xoá guard hoặc thêm test khẳng định nó gắn vào 0 route.

2. **Không rotate được khoá mã hoá PII.** Cột `phoneEncryptionKeyVersion` chỉ để trang trí — không code nào đọc. Đổi giá trị `PII_ENCRYPTION_KEY_V1` mà chưa mã hoá lại dữ liệu = **mất vĩnh viễn** mọi số điện thoại đã lưu, và không có lỗi nào báo vì hiện chưa nơi nào gọi `decrypt()`.

3. **Cột enum Postgres sort theo thứ tự KHAI BÁO, không phải bảng chữ cái.** Đã cắn 2 lần. Sau khi mở rộng 22 quận, `HOC_MON` ở vị trí 17 chứ không phải 0. Mọi assertion về thứ tự phải kiểm lại.

4. **Test xanh không có nghĩa là chạy được.** API từng không khởi động nổi ở bất kỳ chế độ nào trong khi 79 test vẫn xanh. Giờ đã có `corepack pnpm --filter api smoke` (build + khởi động server thật + gọi `/v1/health`) trong CI. Ảnh chụp bắt được lỗi mà test không bắt được (logo từng render thành cục vô nghĩa với mọi test xanh).

---

## 4. Việc còn lại, theo thứ tự khuyến nghị

### Bảo mật / vận hành
- **Rotate `SUPABASE_SERVICE_ROLE_KEY` và mật khẩu database** định kỳ trong Supabase Dashboard, cập nhật lại biến môi trường trên Render. Đây là **repo công khai** — không bao giờ ghi giá trị bí mật thật vào bất kỳ file nào trong repo.
- Thêm security header cho web (`next.config.ts` chưa có `headers()`): thiếu `X-Frame-Options`/CSP `frame-ancestors`, `nosniff`, `Referrer-Policy`. Trang đã đăng nhập có thể bị nhúng iframe → clickjacking vào nút đăng xuất và đổi vai trò.
- `/v1/health` trả `{status:'ok'}` cứng, không chạm DB → database chết vẫn báo khoẻ. Nên thêm `/v1/ready` có `SELECT 1`.

### Tài liệu sai
- `docs/runbooks/auth-provider-setup.md` vẫn hướng dẫn mua SMS gateway (Twilio), trỏ tới `apps/web/src/lib/phone.ts` (file đã xoá) và route `/onboarding/phone` (đã xoá). **Nguy hiểm thật**: người sau sẽ mua gateway vô ích và bật provider SMS → thành mục tiêu SMS-pumping.
- `docs/runbooks/local-development.md:89-91` vẫn ghi 4 khu vực Hóc Môn, chưa nhắc migration thứ 3.

### Cần bạn (chủ sản phẩm) quyết, không phải lỗi kỹ thuật
- **Tagline "Giving Sharing Sustaining" đang là tiếng Anh** trên một sản phẩm thuần Việt (`brand-lockup.tsx`), và nằm cả trong `aria-label` nên screen reader tiếng Việt đọc phải một cụm tiếng Anh ở mọi trang. Tôi **cố ý không tự đổi**: đó là tagline trong file logo bạn đã duyệt, đổi là đổi nhận diện thương hiệu — quyết định của bạn, không phải của tôi. Nếu muốn Việt hoá, cần sửa cả phần chữ hiển thị lẫn `aria-label`.
- **Vai trò của `POST /v1/identity/sync-phone`**: endpoint vẫn sống và gọi được (chỉ sau `JwtAuthGuard`), thực hiện mã hoá + gọi Supabase Admin API, nhưng **không luồng nào trong sản phẩm hiện tại gọi tới được** vì đã bỏ xác minh SĐT. Giữ lại để sau này bật lại, hay xoá bớt bề mặt tấn công? Cần bạn xác nhận.

### Bảo mật mức thấp (chưa khai thác được, nên siết cho chắc)
- `resolveOrigin()` trong `apps/web/src/features/auth/auth-actions.ts:9-15` tin header `x-forwarded-host` để dựng `redirectTo` của OAuth. Hai agent độc lập cùng nêu. **Chưa khai thác được** vì Vercel ghi đè header này ở edge, Server Action của Next có kiểm tra Origin, và Supabase có allowlist redirect — nhưng allowlist của Supabase đang là lớp bảo vệ **duy nhất**. Nên ưu tiên `NEXT_PUBLIC_SITE_URL` thay vì tin header.
- **Access token vẫn sống tới khi hết hạn (~1h) sau khi "đăng xuất mọi thiết bị"**. `signOutEverywhere` thu hồi refresh token, nhưng API chỉ kiểm chữ ký/issuer/audience/hạn dùng, không đối chiếu `session_id` với Supabase. Đây là bản chất của JWT không trạng thái, không phải lỗi — nhưng cần biết: token bị lộ không thể huỷ giữa chừng.
- `NODE_ENV` chỉ có tác dụng ở đúng một chỗ (chặn `ALLOW_INSECURE_SUPABASE_HTTP` ở production), và CI đặt `NODE_ENV: development` nên nhánh production của kiểm tra đó **chưa bao giờ được chạy thật**. Nên set `NODE_ENV=production` rõ ràng trên Render thay vì tin mặc định của nền tảng.

### Chất lượng
- **Lỗ hổng test còn lại**: đổi `orderBy` từ `asc` sang `desc` trong `profiles.service.ts` không làm đỏ một test nào (89/89 vẫn xanh) — vì mọi tầng test đều sort lại trước khi so sánh, do contract cố tình không cam kết thứ tự. Nhưng `/bao-mat` đang hiển thị `me.areas.join(', ')` thẳng cho người dùng. Nên thêm 1 test chạy trên Postgres thật khoá lại thứ tự enum thực tế (ví dụ `QUAN_8` vs `QUAN_10` — nơi thứ tự khai báo và bảng chữ cái khác nhau).
- `(app)/loading.tsx` và `(app)/error.tsx` chưa có test nào. Cả hai đều đơn giản, không có nhánh logic, nên đây là thiếu sót nhỏ — nhưng đúng loại thứ mà ảnh chụp bắt được còn unit test thì không.
- `MIN_AREAS`/`MAX_AREAS` bị khai báo trùng ở 2 nơi (`packages/contracts/src/profile.ts` và `apps/api/src/modules/profiles/profiles.service.ts`, xem lý do ở mục 5) mà **không có test nào khẳng định chúng khớp nhau**. Nếu đổi một bên quên bên kia, không có gì báo.

### Rác còn sót từ scaffold
- `GET /v1/` vẫn trả `"Hello World!"` (`apps/api/src/app.controller.ts`), và `app.controller.spec.ts` đang test đúng cái đó — test không sai, nhưng nó bảo vệ một endpoint vô nghĩa.
- `apps/api/README.md` vẫn là README mặc định của NestJS.
- `apps/web/public/` còn `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg` — ảnh mẫu của Next, không dùng tới.
- `scripts/ensure-contracts-built.mjs`: `LOCK_WAIT_TIMEOUT_MS` (180s) **nhỏ hơn** `LOCK_STALE_AFTER_MS` (300s) → build bị SIGKILL khi đang giữ lock sẽ làm lần build kế tiếp fail chắc chắn 1 lần. Đổi stale xuống 120s.
- `API_BASE_URL` sai/thiếu sẽ fail âm thầm (fallback về localhost, `safeGetMe` nuốt lỗi). Nên throw khi thiếu ở production.
- `onboarding-form.tsx`: mỗi lần đăng ký **thành công** đều tạo unhandled promise rejection (Next reject action promise khi redirect, react-hook-form ném lại). Người dùng không bị ảnh hưởng nhưng log lỗi sẽ có false positive ở đúng luồng thành công.
- Chưa có `not-found.tsx`: người đã đăng nhập gõ URL sai thấy trang 404 tiếng Anh mặc định.
- `x-powered-by: Express` còn lộ trên API.

---

## 5. Lưu ý môi trường (dễ mất thời gian nếu không biết)

- **`pnpm` KHÔNG có trong PATH.** Dùng `corepack pnpm`. Script cấp gốc (`pnpm lint/test/build`) **sẽ fail** vì gọi `pnpm` trần bên trong. Chạy theo từng package:
  `corepack pnpm --filter api <script>` / `--filter web` / `--filter @buy-nothing/contracts`
- **`git` có thể không có trong PowerShell** trên máy này; nó chỉ có trong môi trường Bash.
- Chạy `prisma` cần nạp env trước: `cd apps/api && set -a && source .env && set +a`.
- Đổi `schema.prisma` xong **phải chạy `prisma generate`**, nếu không typecheck báo lỗi enum khó hiểu.
- Postgres local: `docker compose -f infra/docker-compose.yml up -d` (đã pin 17 để khớp production).
- Test cần DB thật:
  `RUN_DATABASE_TESTS=true TEST_DATABASE_URL="postgresql://regive:regive@127.0.0.1:5432/regive_identity_ci" corepack pnpm --filter api test:e2e:db`
- **Không import giá trị từ `@buy-nothing/contracts` vào code API** mà unit test đụng tới: contracts xuất ESM từ `dist/`, config jest của API (rootDir `src`) không transform được → sập cả bộ test. `import type` thì an toàn. Đây là lý do `MIN_AREAS`/`MAX_AREAS` được khai báo lại cục bộ trong `profiles.service.ts`.
- Test web đôi khi timeout worker do tải máy — chạy lại là xanh.

---

## 6. Số liệu test hiện tại

| Bộ | Số lượng |
|---|---|
| contracts | 16 |
| API unit | 76 |
| API e2e (không cần DB) | 5 pass, 4 skip có chủ đích |
| API e2e (cần DB thật) | 4 |
| web unit | 53 |
| web e2e (Playwright) | 13 pass, 2 fixme cần hạ tầng OAuth thật |
