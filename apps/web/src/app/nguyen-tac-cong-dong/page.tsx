import type { Metadata } from 'next';
import { PublicHeader } from '@/components/site/public-header';
import '@/styles/regive-app.css';

export const metadata: Metadata = {
  title: 'Nguyên tắc cộng đồng — ReGive',
  description: 'Những nguyên tắc giữ cho cộng đồng ReGive tử tế, an toàn và không lãng phí.',
};

export default function CommunityGuidelinesPage() {
  return (
    <main className="policy-page">
      <PublicHeader />
      <article>
        <p className="policy-updated">Cập nhật lần cuối: Tháng 8/2026</p>
        <h1>Nguyên tắc cộng đồng</h1>
        <div className="policy-body">
          <p>
            ReGive tồn tại nhờ sự tử tế của từng thành viên. Những nguyên tắc dưới đây áp
            dụng cho tất cả người tặng, người nhận và tình nguyện viên.
          </p>

          <h2>Không mua bán</h2>
          <p>
            ReGive không phải chợ đồ cũ. Mọi món đồ được chia sẻ miễn phí, không thách
            giá, không đổi tiền dưới mọi hình thức.
          </p>

          <h2>Trung thực về tình trạng món đồ</h2>
          <p>
            Mô tả đúng tình trạng thật của món đồ, kể cả những hư hỏng nhỏ. Ảnh chụp cần
            rõ ràng và đúng với món đồ thực tế.
          </p>

          <h2>Tôn trọng thời gian của nhau</h2>
          <ul>
            <li>Phản hồi tin nhắn trong thời gian hợp lý.</li>
            <li>Đến đúng giờ đã hẹn; báo trước nếu có thay đổi.</li>
            <li>Không giữ chỗ một món đồ rồi không đến nhận.</li>
          </ul>

          <h2>Giao tiếp tôn trọng</h2>
          <p>
            Không quấy rối, phân biệt đối xử hay có lời lẽ xúc phạm với bất kỳ thành viên
            nào. Mọi hành vi vi phạm có thể dẫn đến khóa tài khoản.
          </p>

          <h2>Ưu tiên đúng nhu cầu</h2>
          <p>
            Chỉ nhận những món đồ thực sự cần dùng, để món đồ có thể đến tay người cần
            nhất trong khu vực.
          </p>

          <h2>Vi phạm và xử lý</h2>
          <p>
            Thành viên vi phạm nguyên tắc cộng đồng nhiều lần có thể bị tạm khóa hoặc gỡ
            bỏ tài khoản. Xem thêm{' '}
            <a href="/dieu-khoan">Điều khoản sử dụng</a> và{' '}
            <a href="/tro-giup">Trợ giúp</a> để báo cáo vấn đề.
          </p>
        </div>
      </article>
    </main>
  );
}
