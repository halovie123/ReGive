import type { Metadata } from 'next';
import { PublicHeader } from '@/components/site/public-header';
import '@/styles/regive-app.css';

export const metadata: Metadata = {
  title: 'Trợ giúp — ReGive',
  description: 'Câu hỏi thường gặp và cách liên hệ hỗ trợ ReGive.',
};

const FAQS = [
  {
    question: 'ReGive hoạt động ở khu vực nào?',
    answer:
      'Hiện tại ReGive phục vụ 4 khu vực: Hóc Môn, Bà Điểm, Xuân Thới Sơn và Đông Thạnh. Bạn có thể chọn tối đa 4 khu vực hoạt động khi đăng ký.',
  },
  {
    question: 'Vì sao tôi cần xác thực số điện thoại?',
    answer:
      'Xác thực số điện thoại giúp cộng đồng ReGive an toàn và đáng tin cậy hơn, hạn chế tài khoản giả mạo.',
  },
  {
    question: 'Tôi có thể vừa là người tặng vừa là người nhận không?',
    answer:
      'Có. Một tài khoản có thể đảm nhận nhiều vai trò và chuyển đổi vai trò đang hoạt động bất cứ lúc nào.',
  },
  {
    question: 'Làm sao để báo cáo một tài khoản hoặc món đồ vi phạm?',
    answer:
      'Liên hệ với chúng tôi qua thông tin bên dưới, kèm theo tên tài khoản hoặc đường dẫn món đồ cần báo cáo.',
  },
  {
    question: 'Tôi muốn xóa tài khoản thì làm thế nào?',
    answer:
      'Gửi yêu cầu qua email hỗ trợ bên dưới. Chúng tôi sẽ xác nhận và xử lý trong thời gian sớm nhất.',
  },
];

export default function HelpPage() {
  return (
    <main className="policy-page">
      <PublicHeader />
      <article>
        <p className="policy-updated">Cập nhật lần cuối: Tháng 8/2026</p>
        <h1>Trợ giúp</h1>
        <div className="policy-body">
          <p>Câu hỏi thường gặp về cộng đồng chia sẻ đồ dùng ReGive.</p>

          {FAQS.map((faq) => (
            <div key={faq.question}>
              <h2>{faq.question}</h2>
              <p>{faq.answer}</p>
            </div>
          ))}

          <h2>Cần hỗ trợ thêm?</h2>
          <p>
            Email: <a href="mailto:ho-tro@regive.vn">ho-tro@regive.vn</a>
            <br />
            Xem thêm <a href="/an-toan">An toàn</a>,{' '}
            <a href="/nguyen-tac-cong-dong">Nguyên tắc cộng đồng</a> và{' '}
            <a href="/dieu-khoan">Điều khoản sử dụng</a>.
          </p>
        </div>
      </article>
    </main>
  );
}
