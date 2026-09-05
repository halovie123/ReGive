'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeGetMe } from '@/lib/api/server-fetch';
import { nextOnboardingStep } from '@/lib/onboarding-step';
import { createClient } from '@/lib/supabase/server';

async function resolveOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  const protocol = headerList.get('x-forwarded-proto') ?? 'https';
  if (host) return `${protocol}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000';
}

async function startOAuthSignIn(provider: 'google' | 'facebook'): Promise<never> {
  const supabase = await createClient();
  const origin = await resolveOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data?.url) {
    return redirect('/login?error=oauth_start_failed');
  }

  return redirect(data.url);
}

/** Server action bound to the "Tiếp tục với Google" form. Always redirects. */
export async function signInWithGoogle(): Promise<void> {
  await startOAuthSignIn('google');
}

/** Server action bound to the "Tiếp tục với Facebook" form. Always redirects. */
export async function signInWithFacebook(): Promise<void> {
  await startOAuthSignIn('facebook');
}

/**
 * Shared post-authentication routing, used after any successful OAuth
 * sign-in (the /auth/callback route): routes the user to the right next
 * step. Always redirects; never returns.
 */
export async function completeSignInRedirect(): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // safeGetMe, not getMe: this runs in the OAuth callback route, which has
  // no try/catch and no error boundary. A throw here (API cold-starting on
  // Render, 5xx, JWKS drift) would show a brand-new user Next's raw English
  // "Application error" as the very first screen after granting Google
  // consent — and the single-use OAuth code is already spent, so they
  // cannot retry the link. Falling through to /trang-chu lands them in the
  // app shell's friendly Vietnamese error state with a sign-out escape.
  const me = await safeGetMe();
  return redirect(me ? nextOnboardingStep(me) : '/trang-chu');
}

/** Revokes every session for this user (all providers, all devices). */
export async function signOutEverywhere(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'global' });
  return redirect('/');
}
