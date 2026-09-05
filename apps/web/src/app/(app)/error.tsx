'use client';

import '@/styles/regive-app.css';

/**
 * Error boundary for the signed-in app segment.
 *
 * Without this, an uncaught server error anywhere under (app) — a role
 * switch against a sleeping API, a /v1/me failure during a client-side
 * navigation (which does NOT re-run the layout, so the layout's own error
 * state never appears) — replaces the entire app with Next's default
 * untranslated "Application error" page.
 *
 * Rendering here keeps the layout's header and nav intact and swaps only
 * the page slot.
 */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="account-card" aria-labelledby="app-error-title">
      <h1 id="app-error-title">Không tải được nội dung</h1>
      <p className="auth-lead">
        Máy chủ đang bận hoặc tạm thời không phản hồi. Thử lại giúp bạn quay lại ngay,
        không cần đăng nhập lại.
      </p>
      <div className="auth-form-actions">
        <button type="button" className="ui-button" onClick={reset}>
          Thử lại
        </button>
        <a className="ui-button ui-button-secondary" href="/trang-chu">
          Về trang chủ
        </a>
      </div>
    </section>
  );
}
