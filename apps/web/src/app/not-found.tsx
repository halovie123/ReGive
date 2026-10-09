import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLockup } from '@/components/brand/brand-lockup';
import '@/styles/regive-app.css';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang — ReGive',
};

/**
 * Root 404. Signed-out visitors are redirected to /login by the proxy before
 * any unknown path renders, so this is effectively the signed-in user's
 * "you mistyped a URL" page — hence the way back points at /trang-chu, not
 * the marketing landing page. No PublicHeader: its "Đăng nhập" button would
 * be wrong for someone already signed in.
 */
export default function NotFound() {
  return (
    <main className="policy-page">
      <header className="site-header">
        <Link href="/" className="brand-link" aria-label="Về trang chủ ReGive">
          <BrandLockup compact />
        </Link>
      </header>
      <section className="account-card" aria-labelledby="not-found-title">
        <h1 id="not-found-title">Không tìm thấy trang</h1>
        <p className="auth-lead">
          Đường dẫn này không tồn tại hoặc đã bị gỡ. Kiểm tra lại địa chỉ, hoặc quay về trang
          chủ để tiếp tục.
        </p>
        <div className="auth-form-actions">
          <Link className="ui-button" href="/trang-chu">
            Về trang chủ
          </Link>
          <Link className="ui-button ui-button-secondary" href="/tro-giup">
            Trợ giúp
          </Link>
        </div>
      </section>
    </main>
  );
}
