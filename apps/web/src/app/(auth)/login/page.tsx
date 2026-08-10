import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { MeResponse } from '@buy-nothing/contracts';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { LoginForm } from '@/features/auth/login-form';
import { safeGetMe } from '@/lib/api/server-fetch';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import '@/styles/regive-app.css';

export const metadata: Metadata = {
  title: 'Đăng nhập — ReGive',
  description: 'Đăng nhập ReGive bằng Google, Facebook hoặc số điện thoại.',
};

async function getSignedInMe(): Promise<MeResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  // If /v1/me can't be reached (e.g. the API is temporarily down), treat
  // as "not resolvable" and fall through to showing the login screen
  // rather than trap the user.
  return safeGetMe();
}

export default async function LoginPage() {
  // Supabase isn't configured in this environment (e.g. local dev without
  // credentials yet): skip the already-signed-in check entirely rather
  // than crash — /login must always be reachable, same fail-open
  // principle proxy.ts applies to public routes.
  const isSupabaseConfigured = Boolean(supabaseUrl() && supabaseAnonKey());
  const me = isSupabaseConfigured ? await getSignedInMe() : null;

  // Already signed in: send returning users straight to the right step
  // instead of showing the login screen again.
  if (me) {
    if (!me.phoneVerified) redirect('/onboarding/phone');
    if (!me.profile) redirect('/onboarding/profile');
    redirect('/trang-chu');
  }

  return (
    <main className="auth-page">
      <Link className="auth-back" href="/">
        ← Về trang chủ ReGive
      </Link>
      <BrandLockup compact />
      <LoginForm />
    </main>
  );
}
