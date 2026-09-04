import type { Metadata } from 'next';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import '@/styles/regive-app.css';

export const metadata: Metadata = {
  title: 'An toàn — ReGive',
  description: 'Hướng dẫn trao và nhận đồ an toàn trong cộng đồng ReGive.',
};

export default function SafetyPage() {
  return (
    <main className="policy-page">
      <PublicHeader />
      <article>
        <p className="policy-updated">Cập nhật lần cuối: Tháng 8/2026</p>
        <h1>An toàn</h1>
        <div className="policy-body">
          <p>
            Mọi thành viên đăng nhập bằng tài khoản Google hoặc Facebook của mình. Điều
            đó giúp hạn chế tài khoản ảo, nhưng ReGive không thể xác minh danh tính ngoài
            đời của bất kỳ ai — an toàn khi gặp mặt trực tiếp vẫn cần sự cẩn trọng của
            chính bạn.
          </p>

          <h2>Trước khi gặp mặt</h2>
          <ul>
            <li>Trò chuyện qua tin nhắn trong ứng dụng trước khi hẹn gặp.</li>
            <li>Xác nhận rõ địa điểm, thời gian và món đồ trước khi ra khỏi nhà.</li>
            <li>Cho một người thân biết bạn sẽ đi đâu, gặp ai.</li>
          </ul>

          <h2>Khi gặp mặt</h2>
          <ul>
            <li>Chọn nơi công cộng, có ánh sáng tốt và đông người qua lại.</li>
            <li>Ưu tiên khung giờ ban ngày.</li>
            <li>Kiểm tra món đồ ngay tại chỗ trước khi rời đi.</li>
            <li>Không cần chia sẻ địa chỉ nhà riêng nếu bạn chưa thấy thoải mái.</li>
          </ul>

          <h2>Với món đồ cồng kềnh</h2>
          <p>
            Cân nhắc nhờ tình nguyện viên hỗ trợ vận chuyển, hoặc rủ thêm người thân đi
            cùng khi nhận những món đồ lớn.
          </p>

          <h2>Nếu có điều bất thường</h2>
          <p>
            Ngừng liên lạc và báo cáo tài khoản đó cho ReGive ngay lập tức qua trang{' '}
            <a href="/tro-giup">Trợ giúp</a>. Trong tình huống khẩn cấp, hãy liên hệ cơ
            quan công an địa phương trước tiên.
          </p>
        </div>
      </article>
      <PublicFooter />
    </main>
  );
}
