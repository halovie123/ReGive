import type { Metadata } from 'next';
import { signOutEverywhere } from '@/features/auth/auth-actions';
import { getMe } from '@/lib/api/server-fetch';
import { AREA_LABELS, ROLE_LABELS } from '@/lib/labels';

export const metadata: Metadata = {
  title: 'Bảo mật tài khoản',
};

export default async function AccountSecurityPage() {
  // (app)/layout.tsx already guards this route; getMe() here shares the
  // layout's cached result for this request via React's cache().
  const me = await getMe();

  return (
    <section className="account-card" aria-labelledby="account-security-title">
      <div>
        <h1 id="account-security-title">Bảo mật tài khoản</h1>
        <p className="auth-lead">Thông tin định danh và quyền truy cập của bạn trên ReGive.</p>
      </div>

      <dl className="account-grid">
        <div className="account-field">
          <dt>Số điện thoại</dt>
          <dd>{me.phoneLast4 ? `•••• ${me.phoneLast4}` : 'Chưa xác nhận'}</dd>
        </div>
        <div className="account-field">
          <dt>Tên hiển thị</dt>
          <dd>{me.profile?.displayName ?? '—'}</dd>
        </div>
        <div className="account-field">
          <dt>Vai trò</dt>
          <dd>{me.roles.map((role) => ROLE_LABELS[role]).join(', ') || '—'}</dd>
        </div>
        <div className="account-field">
          <dt>Khu vực</dt>
          <dd>{me.areas.map((area) => AREA_LABELS[area]).join(', ') || '—'}</dd>
        </div>
      </dl>

      <div className="account-danger">
        <h2>Đăng xuất khỏi mọi thiết bị</h2>
        <p className="auth-lead">
          Thao tác này sẽ đăng xuất bạn khỏi ReGive trên tất cả thiết bị và thu hồi mọi
          phiên đăng nhập qua Google hoặc Facebook.
        </p>
        <form action={signOutEverywhere}>
          <button type="submit" className="ui-button ui-button-secondary">
            Đăng xuất khỏi mọi thiết bị
          </button>
        </form>
      </div>
    </section>
  );
}
