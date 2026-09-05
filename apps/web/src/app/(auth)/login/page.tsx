import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { MeResponse } from '@buy-nothing/contracts';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { PublicFooter } from '@/components/site/public-footer';
import { LoginForm } from '@/features/auth/login-form';
import { safeGetMe } from '@/lib/api/server-fetch';
import { nextOnboardingStep } from '@/lib/onboarding-step';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import '@/styles/regive-app.css';

export const metadata: Metadata = {
  title: 'Đăng nhập — ReGive',
  description: 'Đăng nhập ReGive bằng Google hoặc Facebook.',
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

/**
 * Four call sites redirect here with ?error=... — signInWithOAuth failing
 * to start, the provider returning an error_description, a missing code,
 * and a failed code exchange. Until now the page ignored searchParams
 * entirely, so a user who declined the Google/Facebook consent screen (or
 * hit a provider hiccup) landed back on an unchanged login page with no
 * explanation, clicked the same button, and bounced again.
 *
 * The provider's own error_description is deliberately NOT shown: it is
 * untrusted, English, and can be attacker-influenced via the callback URL.
 */
function loginErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  if (code === 'oauth_start_failed') {
    return 'Không mở được trang đăng nhập của nhà cung cấp. Vui lòng thử lại.';
  }
  if (code === 'missing_code') {
    return 'Phiên đăng nhập đã hết hạn hoặc bị huỷ. Vui lòng đăng nhập lại.';
  }
  return 'Đăng nhập không thành công. Vui lòng thử lại.';
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = loginErrorMessage(error);

  // Supabase isn't configured in this environment (e.g. local dev without
  // credentials yet): skip the already-signed-in check entirely rather
  // than crash — /login must always be reachable, same fail-open
  // principle proxy.ts applies to public routes.
  const isSupabaseConfigured = Boolean(supabaseUrl() && supabaseAnonKey());
  const me = isSupabaseConfigured ? await getSignedInMe() : null;

  // Already signed in: send returning users straight to the right step
  // instead of showing the login screen again.
  if (me) redirect(nextOnboardingStep(me));

  return (
    <main className="auth-page">
      <Link className="auth-back" href="/">
        ← Về trang chủ ReGive
      </Link>
      <BrandLockup compact />
      {errorMessage && (
        <p className="auth-status" data-tone="error" role="alert">
          {errorMessage}
        </p>
      )}
      <LoginForm />
      <PublicFooter />
    </main>
  );
}
