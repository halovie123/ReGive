import type { Metadata } from 'next';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import '@/styles/regive-app.css';

export const metadata: Metadata = {
  title: 'Quyền riêng tư — ReGive',
  description: 'Cách ReGive thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn.',
};

export default function PrivacyPage() {
  return (
    <main className="policy-page">
      <PublicHeader />
      <article>
        <p className="policy-updated">Cập nhật lần cuối: Tháng 8/2026</p>
        <h1>Quyền riêng tư</h1>
        <div className="policy-body">
          <p>
            ReGive chỉ thu thập những thông tin cần thiết để kết nối cộng đồng chia sẻ đồ
            dùng một cách an toàn.
          </p>

          <h2>Thông tin chúng tôi thu thập</h2>
          <ul>
            <li>Số điện thoại, đã xác thực qua mã OTP, dùng để định danh tài khoản.</li>
            <li>Tên hiển thị, giới thiệu ngắn và ảnh đại diện bạn tự cung cấp.</li>
            <li>Vai trò (người tặng, người nhận, tình nguyện viên) và khu vực hoạt động.</li>
            <li>
              Định danh tài khoản Google hoặc Facebook nếu bạn chọn đăng nhập bằng
              phương thức đó — ReGive không bao giờ nhận hay lưu mật khẩu của bạn.
            </li>
          </ul>

          <h2>Cách chúng tôi bảo vệ dữ liệu</h2>
          <p>
            Số điện thoại của bạn được mã hóa khi lưu trữ. Chúng tôi chỉ hiển thị 4 số
            cuối cho mục đích xác minh, và không hiển thị số điện thoại đầy đủ cho các
            thành viên khác.
          </p>

          <h2>Cách chúng tôi sử dụng dữ liệu</h2>
          <ul>
            <li>Xác thực tài khoản và ngăn chặn gian lận.</li>
            <li>Kết nối bạn với các thành viên khác trong cùng khu vực.</li>
            <li>Cải thiện chất lượng và độ an toàn của nền tảng.</li>
          </ul>
          <p>
            ReGive không bán dữ liệu cá nhân của bạn cho bên thứ ba và không dùng dữ liệu
            cho mục đích quảng cáo bên ngoài nền tảng.
          </p>

          <h2>Quyền của bạn</h2>
          <p>
            Bạn có thể cập nhật hồ sơ, thay đổi vai trò và khu vực hoạt động bất cứ lúc
            nào. Bạn cũng có thể đăng xuất khỏi mọi thiết bị từ trang{' '}
            <a href="/bao-mat">Bảo mật tài khoản</a>, hoặc liên hệ{' '}
            <a href="/tro-giup">Trợ giúp</a> để yêu cầu xóa tài khoản.
          </p>
        </div>
      </article>
      <PublicFooter />
    </main>
  );
}
