import Link from 'next/link';
import { BrandLockup } from '@/components/brand/brand-lockup';

/**
 * Shared header for the public marketing/policy/help pages (not the
 * authenticated app shell in app/(app)/layout.tsx). Reuses the existing
 * .site-header/.main-nav classes already defined in app/globals.css.
 */
export function PublicHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand-link" aria-label="Về trang chủ ReGive">
        <BrandLockup compact />
      </Link>
      <nav aria-label="Điều hướng chính" className="main-nav">
        <Link href="/cach-hoat-dong">Cách hoạt động</Link>
        <Link href="/tro-giup">Trợ giúp</Link>
        <Link className="nav-cta" href="/login">
          Đăng nhập
        </Link>
      </nav>
    </header>
  );
}
