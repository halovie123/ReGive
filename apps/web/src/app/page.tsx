import { BrandLockup } from '@/components/brand/brand-lockup';
import { PublicFooter } from '@/components/site/public-footer';
import '@/styles/regive-app.css';

const categories = ['Đồ gia dụng', 'Quần áo', 'Sách vở', 'Đồ trẻ em', 'Thiết bị'];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a href="#noi-dung" className="brand-link" aria-label="Về trang chủ ReGive">
          <BrandLockup compact />
        </a>
        <nav aria-label="Điều hướng chính" className="main-nav">
          <a href="/cach-hoat-dong">Cách hoạt động</a>
          <a href="#cong-dong">Cộng đồng</a>
          <a className="nav-cta" href="/login">Đăng nhập</a>
        </nav>
      </header>

      <section id="noi-dung" className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Trao đi nhẹ nhàng · Nhận về tử tế</p>
          <h1 id="hero-title">Chia sẻ món đồ cũ, trao thêm một niềm vui</h1>
          <p className="hero-lead">
            ReGive kết nối những người hàng xóm tại Hóc Môn để đồ dùng còn tốt
            tìm được một mái nhà mới — gần gũi, minh bạch và không lãng phí.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="/login">Bắt đầu chia sẻ</a>
            <a className="button button-secondary" href="/cach-hoat-dong">Tìm hiểu cách hoạt động</a>
          </div>
          <ul className="trust-list" aria-label="Cam kết cộng đồng">
            <li>Không mua bán</li>
            <li>Khu vực an toàn</li>
            <li>Uy tín rõ ràng</li>
          </ul>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="gift-card card-one">
            <span className="gift-icon">♻</span>
            <strong>Một món đồ</strong>
            <span>thêm một vòng đời</span>
          </div>
          <div className="gift-card card-two">
            <span className="people-icon">♡</span>
            <strong>Gần bạn</strong>
            <span>Hóc Môn, TP.HCM</span>
          </div>
        </div>
      </section>

      <section id="cach-hoat-dong" className="how-it-works" aria-labelledby="how-title">
        <div>
          <p className="eyebrow">Bắt đầu trong ba bước</p>
          <h2 id="how-title">Cho đúng người, nhận đúng nhu cầu</h2>
        </div>
        <ol className="steps">
          <li><span>01</span><strong>Đăng món đồ</strong><p>Mô tả tình trạng và chọn quận/huyện.</p></li>
          <li><span>02</span><strong>Kết nối</strong><p>Nhắn tin nội bộ để thống nhất cách trao nhận.</p></li>
          <li><span>03</span><strong>Lan tỏa</strong><p>Hoàn tất, đánh giá và xây dựng uy tín.</p></li>
        </ol>
      </section>

      <section id="cong-dong" className="categories" aria-labelledby="category-title">
        <p className="eyebrow">Những món đồ được chào đón</p>
        <h2 id="category-title">Còn dùng tốt là còn có thể sẻ chia</h2>
        <div className="category-list">
          {categories.map((category) => <span key={category}>{category}</span>)}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
