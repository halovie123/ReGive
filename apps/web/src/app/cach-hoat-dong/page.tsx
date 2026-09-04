import type { Metadata } from 'next';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import '@/styles/regive-app.css';

export const metadata: Metadata = {
  title: 'Cách hoạt động — ReGive',
  description: 'ReGive kết nối người tặng, người nhận và tình nguyện viên tại TP.HCM hoạt động như thế nào.',
};

export default function HowItWorksPage() {
  return (
    <main className="policy-page">
      <PublicHeader />
      <article>
        <p className="policy-updated">Cập nhật lần cuối: Tháng 8/2026</p>
        <h1>Cách hoạt động</h1>
        <div className="policy-body">
          <p>
            ReGive là nơi những món đồ còn dùng tốt tìm được một mái nhà mới, thay vì bị
            bỏ đi. Không mua bán — chỉ có sự chia sẻ giữa những người hàng xóm trong cùng
            khu vực trên khắp TP.HCM.
          </p>

          <h2>1. Đăng món đồ</h2>
          <p>
            Người tặng chụp ảnh, mô tả tình trạng món đồ và chọn quận/huyện phù hợp trong
            số 22 khu vực của TP.HCM. Mọi món đồ đăng lên đều được chia sẻ miễn phí.
          </p>

          <h2>2. Kết nối</h2>
          <p>
            Những người quan tâm nhắn tin hỏi thêm thông tin trực tiếp trong ReGive.
            Người tặng xem qua và tự chọn người nhận phù hợp — ReGive không dùng cơ
            chế &quot;ai đến trước được trước&quot;. Sau khi chọn xong, hai bên thống nhất
            thời gian, địa điểm trao nhận; tình nguyện viên có thể hỗ trợ vận chuyển
            khi cần.
          </p>

          <h2>3. Trao và nhận</h2>
          <p>
            Hai bên gặp nhau ở nơi công cộng, an toàn trong khu vực (xem thêm{' '}
            <a href="/an-toan">trang An toàn</a>) để trao món đồ.
          </p>

          <h2>4. Lan tỏa uy tín</h2>
          <p>
            Sau khi hoàn tất, cả hai có thể đánh giá lẫn nhau. Uy tín tích lũy giúp cộng
            đồng ReGive ngày càng đáng tin cậy hơn.
          </p>

          <h2>Ba vai trò trong cộng đồng</h2>
          <ul>
            <li><strong>Người tặng</strong> — chia sẻ món đồ không còn dùng đến.</li>
            <li><strong>Người nhận</strong> — tìm món đồ mình đang cần.</li>
            <li><strong>Tình nguyện viên</strong> — hỗ trợ vận chuyển món đồ trong khu vực.</li>
          </ul>
          <p>Một tài khoản có thể đảm nhận nhiều vai trò cùng lúc.</p>
        </div>
      </article>
      <PublicFooter />
    </main>
  );
}
