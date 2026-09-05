import '@/styles/regive-app.css';

/**
 * Streamed immediately while the (app) layout awaits GET /v1/me.
 *
 * Without this there is no Suspense boundary, so Next cannot flush any HTML
 * until that fetch resolves — and the API runs on Render's free tier, which
 * sleeps after ~15 minutes idle (a cold start was measured at 42s). A
 * returning member would stare at a blank white tab the whole time and
 * reasonably conclude the site is broken.
 */
export default function AppLoading() {
  return (
    <main className="app-loading" aria-busy="true" aria-live="polite">
      <p className="app-loading-title">Đang tải không gian của bạn…</p>
      <p className="app-loading-note">
        Máy chủ có thể mất tới một phút để khởi động sau thời gian không hoạt động.
        Bạn không cần tải lại trang.
      </p>
      <div className="app-loading-bar" role="presentation">
        <span />
      </div>
    </main>
  );
}
