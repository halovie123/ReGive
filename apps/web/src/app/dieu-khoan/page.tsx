import type { Metadata } from 'next';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import '@/styles/regive-app.css';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng — ReGive',
  description: 'Điều khoản sử dụng nền tảng ReGive.',
};

export default function TermsPage() {
  return (
    <main className="policy-page">
      <PublicHeader />
      <article>
        <p className="policy-updated">Cập nhật lần cuối: Tháng 8/2026</p>
        <h1>Điều khoản sử dụng</h1>
        <div className="policy-body">
          <p>
            Bằng việc tạo tài khoản và sử dụng ReGive, bạn đồng ý với các điều khoản dưới
            đây.
          </p>

          <h2>1. Nền tảng phi thương mại</h2>
          <p>
            ReGive chỉ dùng để chia sẻ đồ dùng miễn phí giữa các thành viên trong khu vực
            TP.HCM. Nghiêm cấm mọi hình thức mua, bán, trao đổi có thu phí hoặc quảng cáo
            thương mại trên nền tảng.
          </p>

          <h2>2. Tài khoản</h2>
          <p>
            Bạn tạo tài khoản bằng cách đăng nhập với Google hoặc Facebook. Tài khoản dành
            cho người từ 18 tuổi trở lên; người chưa đủ tuổi cần có phụ huynh hoặc người
            giám hộ đại diện. Bạn chịu trách nhiệm về mọi hoạt động diễn ra dưới tài khoản
            của mình và cần giữ thông tin đăng nhập an toàn.
          </p>

          <h2>3. Nội dung đăng tải</h2>
          <p>
            Bạn chịu trách nhiệm về tính chính xác của thông tin, hình ảnh và mô tả món
            đồ mà bạn đăng. ReGive có quyền gỡ bỏ nội dung vi phạm{' '}
            <a href="/nguyen-tac-cong-dong">Nguyên tắc cộng đồng</a> mà không cần báo
            trước.
          </p>

          <h2>4. Giới hạn trách nhiệm</h2>
          <p>
            ReGive là nền tảng kết nối, không tham gia trực tiếp vào việc trao nhận đồ
            giữa các thành viên và không chịu trách nhiệm về chất lượng, tình trạng hay
            tính hợp pháp của các món đồ được chia sẻ.
          </p>

          <h2>5. Tạm khóa hoặc chấm dứt tài khoản</h2>
          <p>
            ReGive có thể tạm khóa hoặc chấm dứt tài khoản vi phạm điều khoản sử dụng
            hoặc nguyên tắc cộng đồng, nhằm bảo vệ sự an toàn chung của cộng đồng.
          </p>

          <h2>6. Thay đổi điều khoản</h2>
          <p>
            Điều khoản này có thể được cập nhật theo thời gian. Chúng tôi sẽ thông báo
            những thay đổi quan trọng đến thành viên.
          </p>

          <p>
            Xem thêm <a href="/quyen-rieng-tu">Chính sách quyền riêng tư</a> để biết cách
            ReGive xử lý dữ liệu cá nhân của bạn.
          </p>
        </div>
      </article>
      <PublicFooter />
    </main>
  );
}
