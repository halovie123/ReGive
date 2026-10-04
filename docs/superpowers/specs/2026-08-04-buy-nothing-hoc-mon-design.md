# Đặc tả thiết kế nền tảng chia sẻ cộng đồng Hóc Môn

- Ngày: 2026-08-04
- Trạng thái: Đã phê duyệt trong hội thoại, chờ duyệt tài liệu
- Phạm vi: MVP thí điểm tại khu vực Hóc Môn, TP.HCM
- Mô hình: Cộng đồng phi lợi nhuận

## 1. Tầm nhìn sản phẩm

Xây dựng một website kết nối người có vật phẩm không còn nhu cầu với người có thể tiếp tục sử dụng chúng. Sản phẩm giúp giảm lãng phí, tạo thêm vòng đời cho vật phẩm và hình thành một cộng đồng chia sẻ tích cực, an toàn, tôn trọng.

Quy trình cốt lõi là: người tặng đăng vật phẩm, người nhận gửi lời nhắn quan tâm, người tặng tự chọn một người nhận, các bên trao đổi qua chat nội bộ và tự tổ chức trao tặng. Nền tảng không mua bán, không giữ tiền, không quyết định ai xứng đáng nhận và không chịu trách nhiệm vận chuyển trực tiếp.

Ngôn ngữ sản phẩm dùng “chia sẻ”, “trao tặng”, “quan tâm”, “được chọn” và “trao thành công”; tránh cách diễn đạt tạo cảm giác xin–cho hoặc xếp hạng hoàn cảnh.

## 2. Quyết định sản phẩm đã chốt

1. Thí điểm tại khu vực Hóc Môn, TP.HCM.
2. Theo mô hình hành chính hai cấp hiện hành, bộ lọc MVP dùng bốn xã thuộc khu vực Hóc Môn lịch sử: Hóc Môn, Bà Điểm, Xuân Thới Sơn và Đông Thạnh. Danh mục khu vực là dữ liệu cấu hình để có thể cập nhật nếu địa giới hoặc tên gọi thay đổi.
3. Mọi người đều có thể sử dụng vai trò Người nhận; không yêu cầu xác minh hoàn cảnh.
4. Một tài khoản có thể sử dụng cả ba vai trò Người tặng, Người nhận và Tình nguyện viên, đồng thời chuyển ngữ cảnh vai trò bất cứ lúc nào.
5. Người tặng xem lời nhắn, hồ sơ uy tín và tự chọn người nhận; không dùng cơ chế “ai đến trước được trước”.
6. Tình nguyện viên trong MVP chỉ hỗ trợ vận chuyển, không có quyền kiểm duyệt.
7. Chi phí vận chuyển do các bên tự thỏa thuận; nền tảng không thu hoặc xử lý tiền.
8. Chat trên website là kênh mặc định. Số điện thoại, tài khoản mạng xã hội và địa chỉ chi tiết không hiển thị công khai. Người dùng có thể tự chia sẻ thông tin trong chat nếu muốn.
9. Đăng nhập hỗ trợ Google, Facebook hoặc số điện thoại. Mọi tài khoản phải xác minh số điện thoại bằng OTP trước khi tham gia hoạt động cộng đồng.
10. Danh mục MVP gồm đồ gia dụng, quần áo, sách vở, đồ trẻ em và thiết bị còn sử dụng được.
11. Không cho phép tiền, thuốc, thực phẩm dễ hỏng, hàng nguy hiểm, hàng trái pháp luật và vật phẩm không rõ tình trạng.
12. Dự án phi lợi nhuận; MVP không quảng cáo, không thu phí và không hưởng phần trăm giao dịch.
13. KPI chính là số lượt trao tặng hoàn tất và tỷ lệ hoàn tất trên tổng bài đăng đủ điều kiện.
14. Đội vận hành ban đầu gồm 1–2 người bán thời gian.

## 3. Người dùng và nhu cầu

### Người tặng

Muốn đăng vật phẩm nhanh, mô tả rõ tình trạng, xem ai đang quan tâm, trò chuyện an toàn, chọn người nhận phù hợp và xác nhận vật phẩm đã được trao.

### Người nhận

Muốn khám phá vật phẩm theo khu vực và danh mục, hiểu đúng tình trạng món đồ, gửi lời nhắn có ngữ cảnh, theo dõi yêu cầu và trao đổi mà không phải công khai thông tin cá nhân.

### Tình nguyện viên

Muốn xem các chuyến cần hỗ trợ theo khu vực/khung giờ, đề nghị tham gia, được hai bên chấp thuận, chat ba bên và xác nhận quá trình lấy–giao đồ.

### Nhân sự vận hành

Muốn có hàng đợi ưu tiên, bằng chứng tập trung, mẫu xử lý, lịch sử quyết định và dashboard KPI để vận hành an toàn với nguồn lực nhỏ.

## 4. Mục tiêu và thước đo

### KPI chính

- Số giao dịch trao tặng hoàn tất.
- Tỷ lệ giao dịch hoàn tất trên số bài đăng đủ điều kiện.

### KPI phụ

- Tỷ lệ bài đăng nhận được ít nhất một yêu cầu.
- Thời gian trung vị từ khi đăng đến khi giữ chỗ và hoàn tất.
- Tỷ lệ hủy, mở lại bài đăng và no-show.
- Tỷ lệ người dùng quay lại.
- Số chuyến hỗ trợ vận chuyển hoàn tất.
- Số báo cáo nghiêm trọng và thời gian xử lý.
- Số vật phẩm được tái sử dụng theo danh mục và khu vực.

Số tài khoản đăng ký và lượt truy cập chỉ là chỉ số hỗ trợ, không phải thước đo thành công trung tâm.

## 5. Phạm vi chức năng MVP

### Tài khoản và onboarding

- Landing page, cách hoạt động, nguyên tắc cộng đồng, hướng dẫn an toàn, điều khoản và chính sách riêng tư được xem công khai.
- Marketplace, hồ sơ và chat yêu cầu đăng nhập.
- Đăng nhập bằng Google, Facebook hoặc số điện thoại.
- Xác minh OTP bắt buộc khi onboarding; giới hạn số lần gửi và nhập sai.
- Người dùng chọn một hoặc nhiều vai trò, vai trò hiện tại và khu vực hoạt động.
- Cho phép chuyển vai trò mà không tạo tài khoản mới.
- Tài khoản dành cho người từ 18 tuổi; trẻ vị thành niên sử dụng thông qua phụ huynh/người giám hộ.

### Bài đăng vật phẩm

- Tạo nháp, thêm 1–6 ảnh, danh mục, tình trạng, mô tả, khuyết điểm, khu vực và phương thức trao dự kiến.
- Xem trước trước khi xuất bản.
- Chỉnh sửa, rút, hết hạn, mở lại và đánh dấu đã trao.
- Kiểm tra định dạng/dung lượng ảnh, xóa metadata GPS và tạo thumbnail.
- Bộ lọc tự động cho nội dung/hàng cấm và hàng đợi kiểm duyệt theo rủi ro.

### Khám phá

- Feed và tìm kiếm theo từ khóa, danh mục, tình trạng và bốn xã trong khu vực Hóc Môn.
- Chế độ danh sách và bản đồ vùng; không hiển thị tọa độ hoặc pin nhà riêng.
- Chỉ dùng nhãn như “cùng xã” hoặc “xã lân cận”, không hiển thị khoảng cách chính xác.
- Xem hồ sơ uy tín của người tặng và báo cáo bài đăng.

### Yêu cầu nhận và giao dịch

- Người nhận gửi một lời nhắn có ý nghĩa thay vì bấm quan tâm hàng loạt.
- Người tặng xem yêu cầu, hồ sơ, chat và tự chọn một người.
- Một bài đăng chỉ có tối đa một giữ chỗ đang hoạt động.
- Các yêu cầu không được chọn nhận thông báo lịch sự.
- Người tặng có thể mở lại bài nếu việc trao nhận thất bại.
- Cả hai bên xác nhận hoàn tất; trường hợp mâu thuẫn chuyển sang hỗ trợ.

### Chat nội bộ

- Hội thoại gắn với bài đăng, giao dịch hoặc chuyến hỗ trợ; không cho phép nhắn tin ngẫu nhiên tới mọi tài khoản.
- Tin nhắn văn bản và ảnh, trạng thái đã gửi/đã đọc, chặn và báo cáo.
- Người dùng có thể tự chia sẻ kênh liên hệ ngoài nền tảng trong chat.
- Quản trị viên chỉ xem phần hội thoại liên quan khi có báo cáo/quyền hợp lệ; mọi lần truy cập được audit.

### Tình nguyện viên vận chuyển

- Tạo yêu cầu hỗ trợ theo khu vực lấy/giao, khung giờ, loại vật phẩm và ghi chú chi phí dự kiến.
- Tình nguyện viên đề nghị hỗ trợ; hai bên xác nhận người được chọn.
- Mở chat ba bên và theo dõi các trạng thái đã nhận đồ, đang giao, đã giao hoặc hủy.
- Không hiển thị địa chỉ chi tiết trước khi tình nguyện viên được chọn; địa điểm cụ thể do các bên chia sẻ trong chat.

### Uy tín, đánh giá và lịch sử

- Chỉ các bên trong giao dịch hoàn tất được đánh giá nhau, một lần cho mỗi giao dịch.
- Đánh giá độc lập; công bố sau khi cả hai đánh giá hoặc hết thời hạn.
- Tiêu chí gồm giao tiếp, đúng hẹn, vật phẩm đúng mô tả và cẩn thận khi vận chuyển.
- Hồ sơ hiển thị thời gian tham gia, trạng thái xác minh, số giao dịch/chuyến hoàn tất, tỷ lệ hoàn tất, điểm uy tín, cấp độ và đánh giá gần đây.
- Không dùng số lượt nhận đồ làm tín hiệu tiêu cực.

### Thông báo

- Thông báo trong web cho yêu cầu mới, kết quả lựa chọn, tin nhắn, bài sắp hết hạn, xác nhận hoàn tất, tình nguyện viên và kết quả báo cáo.
- SMS chỉ dùng cho OTP và cảnh báo bảo mật quan trọng trong MVP.

### Báo cáo và quản trị

- Báo cáo tài khoản, bài đăng, giao dịch, đánh giá hoặc tin nhắn.
- Hàng đợi theo mức độ: an toàn/lừa đảo, quấy rối/riêng tư, giao nhận/no-show, chất lượng nội dung.
- Hành động: bỏ qua, cảnh cáo, ẩn nội dung, hạn chế, khóa và tiếp nhận kháng nghị.
- Dashboard KPI, quản lý danh mục/khu vực, mẫu thông báo và audit log.
- Vai trò quản trị: Support, Moderator, Administrator và Auditor.

## 6. User flow

### Onboarding

Landing → chọn phương thức đăng nhập → xác minh OTP → tạo hồ sơ → chọn vai trò → chọn vai trò hiện tại → chọn xã hoạt động → trang chủ cá nhân hóa.

### Người tặng

Trang chủ → Đăng tặng → ảnh → danh mục/tình trạng → mô tả/khuyết điểm → xã → cách trao → xem trước → xuất bản → nhận yêu cầu → xem hồ sơ/chat → chọn người nhận → giữ chỗ → thỏa thuận → xác nhận hoàn tất → đánh giá.

### Người nhận

Khám phá → lọc/xem bản đồ vùng → chi tiết vật phẩm → xem hồ sơ người tặng → gửi lời nhắn → chat → chờ lựa chọn → thỏa thuận → nhận hoặc yêu cầu vận chuyển → xác nhận → đánh giá.

### Tình nguyện viên

Chuyển vai trò → xem chuyến theo xã/khung giờ → đề nghị hỗ trợ → được chấp thuận → chat ba bên → nhận đồ → giao đồ → xác nhận → nhận đánh giá.

## 7. Vòng đời dữ liệu nghiệp vụ

### Bài đăng

`DRAFT → PUBLISHED → RESERVED → COMPLETED`

Các nhánh hợp lệ: `DRAFT/PUBLISHED → WITHDRAWN`, `PUBLISHED → EXPIRED`, `PUBLISHED → MODERATION_HIDDEN`, `RESERVED → PUBLISHED` khi mở lại.

### Yêu cầu nhận

`PENDING → ACCEPTED → COMPLETED`

Các nhánh hợp lệ: `PENDING → DECLINED/WITHDRAWN/EXPIRED`. Khi người tặng chọn một yêu cầu, backend trong cùng transaction chuyển yêu cầu đó thành `ACCEPTED`, bài đăng thành `RESERVED`, tạo giao dịch và đóng các yêu cầu còn lại.

### Giao dịch

`RESERVED → ARRANGING → HANDOVER_PENDING → COMPLETED`

Các nhánh: `CANCELLED`, `REOPENED` hoặc `SUPPORT_REQUIRED`. Chỉ giao dịch được hai bên xác nhận mới tính hoàn tất đầy đủ. Một bên xác nhận và bên kia không phản hồi sau thời hạn được ghi là `COMPLETION_PENDING_REVIEW`, chưa cộng đầy đủ uy tín.

### Vận chuyển tình nguyện

`OPEN → VOLUNTEER_SELECTED → PICKUP_CONFIRMED → IN_TRANSIT → DELIVERED`

Có thể chuyển `CANCELLED` trước khi hoàn tất; lý do hủy được ghi vào lịch sử sự kiện.

## 8. Sitemap

### Công khai

- Trang giới thiệu
- Cách hoạt động
- Nguyên tắc cộng đồng
- An toàn khi trao nhận
- Điều khoản sử dụng
- Chính sách riêng tư
- Đăng nhập/đăng ký

### Sau đăng nhập

- Trang chủ
- Khám phá: danh sách, bản đồ vùng, bộ lọc, chi tiết
- Đăng tặng
- Hoạt động của tôi: bài đăng, yêu cầu nhận, giao dịch, chuyến tình nguyện
- Tin nhắn
- Thông báo
- Hồ sơ: uy tín, đánh giá, lịch sử, vai trò/khu vực, bảo mật
- Trung tâm an toàn
- Trợ giúp

### Quản trị

- Tổng quan KPI
- Bài đăng cần duyệt
- Báo cáo/tranh chấp
- Người dùng
- Danh mục/khu vực
- Quy tắc uy tín
- Nhật ký quản trị
- Nội dung trang tĩnh

## 9. UX/UI và frontend

### Định hướng

- Hiện đại, tối giản, nhiều khoảng trắng, xanh lá và trắng, chuyển động mềm, thân thiện.
- Logo/brand đã chốt là ReGive với biểu tượng đôi tay tạo thành trái tim/vòng tuần hoàn và tagline “Giving Sharing Sustaining”. Palette triển khai: lime `#A8D67A`, mint `#9FD3C7`, green `#6FAF68`, ink `#24372B`, warm white `#FBFCF8`.
- Mobile-first; ảnh vật phẩm là trọng tâm.
- Không sao chép trực tiếp ypptour.pro. Trang tham chiếu không truy cập được trong giai đoạn thiết kế, nên đặc tả chỉ sử dụng các thuộc tính phong cách do chủ sản phẩm mô tả.
- Typography mặc định: Be Vietnam Pro; dùng system sans-serif làm fallback.
- Màu chính: `#166534`; hành động: `#15803D`; nền xanh nhẹ: `#F0FDF4`; chữ chính: `#17201B`; viền: `#DDE6DF`; cảnh báo: `#B45309`; nguy hiểm: `#B42318`.
- Animation chủ yếu 150–300 ms và tôn trọng thiết lập giảm chuyển động.
- Mục tiêu khả năng tiếp cận WCAG mức AA.

### Navigation

- Desktop: logo, Khám phá, Cách hoạt động, bộ chọn vai trò, thông báo và hồ sơ.
- Mobile: Trang chủ, Khám phá, Đăng tặng, Tin nhắn và Cá nhân; nút Đăng tặng ở vị trí nổi bật.
- Vai trò hiện tại đổi nội dung ưu tiên trên trang chủ, không tạo ba ứng dụng tách biệt.

### Công nghệ frontend

- Next.js, TypeScript và Tailwind CSS.
- Bộ component headless có khả năng tiếp cận.
- Query cache cho dữ liệu máy chủ, schema validation cho form, WebSocket client cho chat/thông báo.
- PWA cài lên màn hình chính; chưa làm ứng dụng native.
- Landing/chính sách render phía server; vùng tương tác sau đăng nhập kết hợp server/client; chat và bộ lọc tức thời chạy phía client.
- Danh sách dùng cursor pagination, ảnh resize/lazy loading, bản đồ chỉ tải khi cần.

### Cấu trúc màn hình chính

- Trang chủ: hero ngắn, ô tìm kiếm, bộ chọn xã, CTA Đăng tặng, danh mục, vật phẩm mới, bản đồ vùng và bộ đếm tác động. Khối ưu tiên thay đổi theo vai trò hiện tại.
- Card vật phẩm: ảnh, nhãn mới/tình trạng, tiêu đề, xã, danh mục và số người quan tâm; không hiện số điện thoại hoặc khoảng cách chính xác.
- Chi tiết vật phẩm: thư viện ảnh ở trái/trên, thông tin–khuyết điểm–cách trao và hồ sơ người tặng ở phải/dưới, CTA Gửi yêu cầu nhận, Lưu và Báo cáo.
- Tin nhắn desktop: danh sách hội thoại bên trái, hội thoại bên phải; header luôn hiện vật phẩm và trạng thái giao dịch. Trên mobile hai phần là hai màn hình riêng.
- Trang hoạt động: tab Bài đăng, Yêu cầu nhận, Giao dịch và Chuyến tình nguyện; mỗi mục hiển thị trạng thái và hành động kế tiếp.
- Trang quản trị: dashboard desktop-first, hàng đợi bên trái/bộ lọc phía trên, case detail có bằng chứng–lịch sử–hành động ở cùng một màn hình.

## 10. Kiến trúc hệ thống

Chọn modular monolith kết hợp dịch vụ quản lý sẵn. Một backend được chia module có ranh giới rõ, một PostgreSQL là nguồn dữ liệu chính; Redis và object storage phục vụ nhu cầu chuyên biệt. Không dùng microservices trong MVP.

### Thành phần

- Frontend: Next.js.
- Backend: NestJS modular monolith.
- API nghiệp vụ: REST.
- Realtime: WebSocket cho chat, trạng thái đọc và thông báo.
- Database: managed PostgreSQL.
- Cache/queue/presence: managed Redis.
- Ảnh: object storage tương thích S3.
- Xác thực: nhà cung cấp OAuth/OTP được quản lý.
- Tìm kiếm MVP: PostgreSQL full-text search.
- Worker: xử lý ảnh, thông báo, hết hạn, nhắc xác nhận, tính uy tín và tổng hợp KPI.

### Module backend

- Identity & Access
- User Profile & Roles
- Listings & Categories
- Discovery & Areas
- Receive Requests & Gift Transactions
- Internal Chat
- Volunteer Delivery
- Reputation & Reviews
- Notifications
- Reports & Moderation
- Admin & Impact Analytics

Mỗi module sở hữu bảng/nghiệp vụ của nó và chỉ được truy cập qua service/API nội bộ. Mục tiêu là có thể thay đổi hoặc tách module sau này mà không phá vỡ phần còn lại.

## 11. Mô hình dữ liệu

### Identity/profile

- `users`: trạng thái, số điện thoại đã xác minh, vai trò hiện tại.
- `auth_identities`: liên kết Google, Facebook hoặc phone identity.
- `user_roles`: các vai trò được bật.
- `profiles`: tên, avatar, giới thiệu, dữ liệu uy tín tổng hợp.
- `areas`: bốn xã cấu hình và cấu trúc mở rộng.
- `user_areas`: khu vực hoạt động.

### Listings/transactions

- `categories`
- `listings`
- `listing_images`
- `receive_requests`
- `gift_transactions`
- `transaction_events`

Ràng buộc: người dùng không xin nhận bài của chính mình; chỉ một reservation hoạt động trên mỗi listing; việc accept request và reserve listing là atomic.

### Chat

- `conversations`
- `conversation_members`
- `messages`
- `message_attachments`
- `message_reports`

Tin nhắn được lưu PostgreSQL trước rồi mới phát qua WebSocket. Redis không phải nguồn dữ liệu bền vững.

### Delivery

- `delivery_requests`
- `delivery_applications`
- `delivery_assignments`
- `delivery_events`

### Trust/moderation

- `reviews`
- `reputation_events`
- `reports`
- `moderation_actions`
- `audit_logs`
- `notifications`

Điểm uy tín được suy ra từ `reputation_events`, không chỉnh sửa tổng điểm mà không có sự kiện/lý do.

## 12. Điểm uy tín

- Điểm công khai nằm trong khoảng 0–100 và đi kèm cấp độ: Mới tham gia, Đã xác minh, Đáng tin cậy, Thành viên tích cực, Người lan tỏa.
- Giao dịch hai bên xác nhận: +2; nhận và phản hồi đầy đủ: +1; chuyến tình nguyện hoàn tất: +3; đánh giá tốt: +1 đến +2.
- Hủy sớm có lý do: không trừ; hủy sát giờ lặp lại: −2 đến −4; no-show đã xác minh: −6; vi phạm: −5 đến −20; lừa đảo/nguy hiểm: khóa theo quyết định kiểm duyệt.
- Có trần điểm theo thời gian và phát hiện quan hệ bất thường để hạn chế giao dịch giả.
- Điểm rủi ro chống gian lận là dữ liệu nội bộ, không công khai.
- Trọng số chi tiết chống gian lận không được công bố; nguyên tắc chung và quyền kháng nghị được công khai.

## 13. Kiểm duyệt và vận hành

Nội dung rủi ro thấp được đăng ngay. Nội dung rủi ro vừa chuyển `PENDING_REVIEW`, chỉ chủ bài thấy và chưa xuất hiện trong khám phá. Nội dung rủi ro cao chuyển `MODERATION_HIDDEN`, tạo case ưu tiên và không được xuất bản. Tín hiệu gồm từ khóa hàng cấm, chia sẻ số điện thoại trong bài, nội dung/ảnh trùng, tần suất bất thường, báo cáo độc lập và yêu cầu chuyển tiền.

Quy trình: báo cáo → phân loại → tạm ẩn nếu nguy cơ tức thời → con người xem bằng chứng → bỏ qua/cảnh cáo/ẩn/hạn chế/khóa → thông báo → kháng nghị.

Không khóa vĩnh viễn chỉ dựa trên thuật toán. Tất cả hành động nhạy cảm có lý do và audit log. Với đội 1–2 người, hệ thống ưu tiên hàng đợi theo nguy cơ, mẫu trả lời, tự động hết hạn/nhắc xác nhận và review hằng tuần các quyết định khóa nhầm.

## 14. Bảo mật và riêng tư

- OAuth không lưu mật khẩu Google/Facebook.
- OTP thời hạn ngắn, rate limit theo tài khoản/số điện thoại/IP và khóa tạm sau nhiều lần sai.
- Phiên web dùng cookie HttpOnly, Secure và SameSite; hỗ trợ đăng xuất mọi thiết bị.
- RBAC cho quản trị kết hợp kiểm tra quan hệ dữ liệu cho người dùng.
- Mọi quyền được xác minh ở backend.
- HTTPS cho dữ liệu truyền; mã hóa số điện thoại khi lưu; không log OTP/token/số điện thoại đầy đủ.
- Không lưu tọa độ nhà riêng dưới dạng dữ liệu công khai; xóa GPS metadata khỏi ảnh.
- File upload dùng URL có thời hạn, giới hạn loại/dung lượng, kiểm tra nội dung và xử lý thumbnail.
- Rate limit bài đăng, yêu cầu và tin nhắn; tài khoản mới có hạn mức thấp hơn.
- Idempotency key cho hành động quan trọng; database transaction cho chuyển trạng thái.
- Audit mọi lần quản trị viên xem dữ liệu nhạy cảm hoặc thay đổi tài khoản/uy tín.
- Chính sách lưu giữ/xóa dữ liệu, tiếp nhận yêu cầu của chủ thể dữ liệu và nội dung pháp lý phải được luật sư Việt Nam rà soát trước public beta.

## 15. Hạ tầng và triển khai

Luồng triển khai: người dùng → CDN/WAF → Next.js → NestJS REST/WebSocket → PostgreSQL/Redis/object storage/OAuth-OTP/monitoring.

Ba môi trường độc lập: development, staging và production. Không sao chép dữ liệu cá nhân production về development.

MVP giả định vài nghìn tài khoản và vài trăm người hoạt động mỗi ngày. Bắt đầu với một backend instance; scale dọc trước, sau đó nhiều instance sau load balancer, Redis phân phối realtime/queue và worker tách riêng. Chỉ tách microservice khi số liệu vận hành chứng minh cần thiết.

Closed beta dùng backup database mã hóa tự động hằng ngày, giữ tối thiểu 7 ngày. Trước public beta phải bật point-in-time recovery với cửa sổ tối thiểu 7 ngày. Diễn tập khôi phục được thực hiện trước closed beta và tối thiểu mỗi quý. Mục tiêu MVP là phục hồi sự cố nghiêm trọng trong cùng ngày.

Theo dõi lỗi API, độ trễ, WebSocket, queue, database, OTP bất thường, dung lượng ảnh và hành động quản trị; log dùng correlation ID nhưng không chứa bí mật hoặc nội dung chat đầy đủ.

## 16. Xử lý lỗi và tính nhất quán

- API trả mã lỗi nghiệp vụ ổn định và thông điệp thân thiện.
- Frontend có trạng thái loading, empty, error và retry cho mọi luồng dữ liệu.
- Mạng chập chờn không tạo trùng giao dịch/tin nhắn nhờ idempotency và unique constraint.
- Worker retry có giới hạn và chuyển dead-letter queue khi thất bại lặp lại.
- WebSocket mất kết nối tự nối lại và lấy phần dữ liệu còn thiếu qua REST/cursor.
- Mâu thuẫn xác nhận giao nhận tạo case hỗ trợ thay vì tự ý kết luận.

## 17. Kiểm thử

### Unit

Chuyển trạng thái, chọn người nhận, tính uy tín, phân quyền, hết hạn và mở lại.

### Integration

PostgreSQL/Redis thật trong môi trường test; kiểm tra reservation đồng thời, lưu/phát chat, quyền hội thoại, cập nhật khi hủy và vô hiệu hóa phiên sau khi khóa.

### End-to-end

Đăng nhập/OTP; đăng vật phẩm; gửi/chọn yêu cầu; chat; xác nhận; đánh giá; yêu cầu tình nguyện viên; báo cáo và xử lý quản trị.

### Phi chức năng

Responsive, bàn phím/screen reader, mạng yếu, tải đồng thời, bảo mật web, quyền truy cập, backup/restore và khả năng quan sát sự cố.

## 18. Roadmap

### Giai đoạn 0: Chuẩn bị cộng đồng

Hoàn thiện chính sách, tuyển nguồn vật phẩm ban đầu, kết nối đối tác địa phương, đào tạo đội vận hành và diễn tập xử lý sự cố.

### Giai đoạn 1: Closed beta

Mời nhóm giới hạn tại bốn xã, theo dõi từng giao dịch, đo conversion/hủy/no-show, phỏng vấn người dùng và điều chỉnh onboarding/thông báo/uy tín.

### Giai đoạn 2: Public beta

Mở đăng ký toàn khu vực, phát triển mạng tình nguyện viên, thử điểm hẹn cộng đồng, công bố dashboard tác động và tối ưu kiểm duyệt.

### Giai đoạn 3: Mở rộng

Chỉ thêm địa bàn khi nguồn vật phẩm, tỷ lệ hoàn tất, thời gian xử lý báo cáo, năng lực vận hành và chi phí trên lượt trao đạt ngưỡng do tổ chức phê duyệt.

### Sau MVP

- Email/web push.
- Yêu thích, lưu bộ lọc và cảnh báo món phù hợp.
- Điểm hẹn cộng đồng.
- Hồ sơ tổ chức/chiến dịch theo mùa.
- Dashboard tác động và báo cáo cho nhà tài trợ.
- Ghép nhu cầu–vật phẩm có hỗ trợ, không tự quyết định người nhận.
- Ứng dụng native/đa ngôn ngữ chỉ khi web đã chứng minh nhu cầu.

## 19. Ngoài phạm vi MVP

- Thanh toán, đặt cọc hoặc phần trăm giao dịch.
- Bản đồ vị trí chính xác.
- Dịch vụ giao hàng thương mại.
- Ứng dụng iOS/Android native.
- AI quyết định người xứng đáng nhận.
- Bảng xếp hạng người tặng/người nhận.
- Tiền, thuốc, thực phẩm dễ hỏng hoặc hàng nguy hiểm.
- Mở rộng toàn TP.HCM/toàn quốc trước khi thí điểm đạt tiêu chí.

## 20. Tiêu chí nghiệm thu cấp sản phẩm

MVP được xem là sẵn sàng closed beta khi:

1. Ba vai trò hoàn thành được luồng chính trên mobile và desktop.
2. Không thể xem marketplace/chat khi chưa đăng nhập và chưa hoàn thành điều kiện xác minh tương ứng.
3. Một vật phẩm không thể được giữ chỗ đồng thời cho hai người.
4. Chat khôi phục được sau mất kết nối và không cho người ngoài truy cập.
5. Địa chỉ/tọa độ chính xác không xuất hiện trên listing/map/profile công khai.
6. Mọi giao dịch hoàn tất có bằng chứng xác nhận và lịch sử trạng thái.
7. Đánh giá chỉ được tạo bởi bên hợp lệ sau giao dịch.
8. Báo cáo nghiêm trọng đi đúng hàng đợi và hành động quản trị có audit log.
9. Backup đã được thử khôi phục thành công.
10. Các luồng E2E cốt lõi, kiểm thử phân quyền và kiểm thử responsive đều đạt.
11. Nguyên tắc cộng đồng, hướng dẫn an toàn, điều khoản và chính sách riêng tư đã được phê duyệt.

## 21. Rủi ro và biện pháp

- Trang trống khi ra mắt: tuyển người tặng/đối tác trước public beta.
- Gửi yêu cầu hàng loạt: lời nhắn bắt buộc, hạn mức và tín hiệu uy tín.
- No-show: nhắc lịch, xác nhận hai chiều và chỉ trừ điểm khi có bằng chứng.
- Lừa đảo/đặt cọc: cảnh báo trong chat, lọc tín hiệu và báo cáo nhanh.
- Lộ địa chỉ: chỉ hiện xã; điểm gặp cụ thể chia sẻ có chủ đích.
- Quá tải kiểm duyệt: phân loại rủi ro, mẫu xử lý và tự động hóa tác vụ lặp lại.
- Rủi ro tình nguyện viên: xác minh, chat ba bên, hướng dẫn an toàn và không lộ địa chỉ sớm.
- Thao túng uy tín: trần điểm, phát hiện quan hệ bất thường và audit.
- Mở rộng quá nhanh: dùng cổng KPI/vận hành trước khi mở địa bàn mới.

## 22. Các giả định bắt buộc được xác nhận khi lập kế hoạch

- Repository mới hoàn toàn và chưa có ràng buộc công nghệ kế thừa.
- Đội triển khai sẽ chọn nhà cung cấp hosting/OAuth/OTP/object storage trong kế hoạch kỹ thuật dựa trên ngân sách thực tế; thiết kế hiện tại giữ giao diện tích hợp độc lập nhà cung cấp.
- Sản phẩm web tiếng Việt là kênh duy nhất của MVP.
- Không có xử lý tiền hoặc đảm bảo pháp lý cho giao dịch giữa các bên.
- Bốn xã Hóc Môn, Bà Điểm, Xuân Thới Sơn và Đông Thạnh là cấu hình thí điểm; dữ liệu địa giới được version hóa thay vì hard-code trong logic.

## 23. Nguồn tham chiếu quyết định

- Sắp xếp khu vực Hóc Môn thành bốn xã Hóc Môn, Bà Điểm, Xuân Thới Sơn và Đông Thạnh: Cổng Thông tin điện tử Chính phủ, https://xaydungchinhsach.chinhphu.vn/tp-hcm-du-kien-ten-goi-cac-phuong-xa-moi-sau-sap-xep-11925041814414893.htm
- PostgreSQL là phần mềm mã nguồn mở không thu phí giấy phép: PostgreSQL Global Development Group, https://www.postgresql.org/about/licence/
