import Link from 'next/link';

/**
 * Shared footer for every public (signed-out) surface: the landing page,
 * /login and the policy/help pages. It is the only place that links to all
 * six public content routes — PublicHeader only carries two of them — so
 * without it those pages are unreachable from anywhere in the app.
 *
 * Styles live in styles/regive-app.css alongside the other public-page
 * styles (app/globals.css has unrelated pending edits in this worktree).
 */

const FOOTER_LINKS = [
  { href: '/cach-hoat-dong', label: 'Cách hoạt động' },
  { href: '/nguyen-tac-cong-dong', label: 'Nguyên tắc cộng đồng' },
  { href: '/an-toan', label: 'An toàn' },
  { href: '/dieu-khoan', label: 'Điều khoản sử dụng' },
  { href: '/quyen-rieng-tu', label: 'Quyền riêng tư' },
  { href: '/tro-giup', label: 'Trợ giúp' },
] as const;

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <nav aria-label="Liên kết trang công khai" className="public-footer-nav">
        {FOOTER_LINKS.map(({ href, label }) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      <p className="public-footer-note">
        ReGive — chia sẻ đồ dùng còn tốt trong khu vực Hóc Môn, TP.HCM. Không mua bán.
      </p>
    </footer>
  );
}
