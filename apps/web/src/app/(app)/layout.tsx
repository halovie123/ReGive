import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { USER_ROLES, type UserRole } from '@buy-nothing/contracts';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { StatusState } from '@/components/ui/status-state';
import { signOutEverywhere } from '@/features/auth/auth-actions';
import { apiFetch, safeGetMe } from '@/lib/api/server-fetch';
import { ROLE_LABELS } from '@/lib/labels';
import { nextOnboardingStep } from '@/lib/onboarding-step';
import { createClient } from '@/lib/supabase/server';
import '@/styles/regive-app.css';

export const metadata: Metadata = {
  title: {
    default: 'ReGive',
    template: '%s — ReGive',
  },
};

async function updateActiveRoleAction(formData: FormData) {
  'use server';
  const activeRole = String(formData.get('activeRole') ?? '');
  if (!USER_ROLES.includes(activeRole as UserRole)) return;

  try {
    await apiFetch('/me/active-role', {
      method: 'PUT',
      body: JSON.stringify({ activeRole }),
    });
  } catch {
    // Swallow deliberately. An unhandled throw out of a Server Action with
    // no error boundary replaces the whole app shell with Next's default
    // error page — losing the user's session view over a role dropdown.
    // The revalidate below re-renders with the unchanged role, so the
    // switcher simply snaps back and the user can retry.
    return;
  }

  revalidatePath('/trang-chu');
  revalidatePath('/bao-mat');
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const me = await safeGetMe();

  if (!me) {
    // The Supabase session is valid but /v1/me couldn't be reached (API
    // down, DB down, JWT secret mismatch, etc). Do NOT redirect('/login')
    // here: proxy.ts sends any signed-in user straight back to
    // /trang-chu, which would land right back in this branch forever
    // (see task-5-report.md, Fix round 1, finding 1). Render an in-place
    // error state instead, with a sign-out escape hatch that only talks
    // to Supabase (not our API), so the user is never stuck.
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header-row">
            <span className="brand-link" aria-hidden="true">
              <BrandLockup compact />
            </span>
          </div>
        </header>
        <main className="app-main">
          <StatusState
            state="error"
            message="Không thể tải thông tin tài khoản"
            description="Máy chủ hiện không phản hồi. Vui lòng thử lại sau ít phút, hoặc đăng xuất và đăng nhập lại."
          />
          <form action={signOutEverywhere}>
            <button type="submit" className="ui-button ui-button-secondary">
              Đăng xuất
            </button>
          </form>
        </main>
      </div>
    );
  }

  const destination = nextOnboardingStep(me);
  if (destination !== '/trang-chu') redirect(destination);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-row">
          <Link href="/trang-chu" className="brand-link" aria-label="Về trang chủ ReGive">
            <BrandLockup compact />
          </Link>

          <nav className="app-nav-links" aria-label="Điều hướng chính">
            <Link href="/trang-chu">Trang chủ</Link>
            <Link href="/bao-mat">Bảo mật tài khoản</Link>
          </nav>

          <div className="app-actions">
            {me.roles.length > 1 && (
              <form action={updateActiveRoleAction} className="role-switcher">
                <label className="field">
                  <span className="field-label">Vai trò</span>
                  <select
                    name="activeRole"
                    defaultValue={me.activeRole ?? me.roles[0]}
                    className="field-control"
                  >
                    {me.roles.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="ui-button ui-button-secondary">
                  Đổi
                </button>
              </form>
            )}

            <button type="button" className="icon-action" aria-label="Thông báo" disabled>
              🔔
            </button>
            <Link href="/bao-mat" className="icon-action" aria-label="Tài khoản của bạn">
              👤
            </Link>

            <details className="mobile-nav">
              <summary aria-label="Mở menu điều hướng">☰</summary>
              <nav className="mobile-nav-panel" aria-label="Điều hướng trên thiết bị di động">
                <Link href="/trang-chu">Trang chủ</Link>
                <Link href="/bao-mat">Bảo mật tài khoản</Link>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
}
