import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { USER_ROLES, type UserRole } from '@buy-nothing/contracts';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { apiFetch, safeGetMe } from '@/lib/api/server-fetch';
import { ROLE_LABELS } from '@/lib/labels';
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

  await apiFetch('/me/active-role', {
    method: 'PUT',
    body: JSON.stringify({ activeRole }),
  });

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
  if (!me) redirect('/login');
  if (!me.phoneVerified) redirect('/onboarding/phone');
  if (!me.profile) redirect('/onboarding/profile');

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
