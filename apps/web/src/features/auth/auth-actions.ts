'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch, getMe, isApiProblemError } from '@/lib/api/server-fetch';
import { mapSupabaseAuthError, type PhoneActionState } from '@/lib/action-state';
import { normalizeVietnamesePhone } from '@/lib/phone';
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

/** Step 1 of phone sign-in: send an OTP code via Supabase phone auth. */
export async function requestPhoneOtp(
  _prevState: PhoneActionState,
  formData: FormData,
): Promise<PhoneActionState> {
  const rawPhone = String(formData.get('phone') ?? '');
  const phone = normalizeVietnamesePhone(rawPhone);
  if (!phone) {
    return { status: 'error', message: 'Số điện thoại không hợp lệ. Vui lòng nhập lại.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) {
    return { status: 'error', message: mapSupabaseAuthError(error.message) };
  }

  return { status: 'otp-sent', phone };
}

/**
 * Step 2 of phone sign-in: verify the OTP code, which establishes a
 * Supabase session, then hand off to completeSignInRedirect. Always
 * redirects on success.
 */
export async function verifyPhoneOtp(
  _prevState: PhoneActionState,
  formData: FormData,
): Promise<PhoneActionState> {
  const phone = String(formData.get('phone') ?? '');
  const code = String(formData.get('code') ?? '').trim();
  if (!phone || !code) {
    return { status: 'error', message: 'Vui lòng nhập mã xác thực.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
  if (error) {
    return { status: 'error', message: mapSupabaseAuthError(error.message) };
  }

  return await completeSignInRedirect();
}

/**
 * Shared post-authentication routing, used after any successful sign-in
 * (OAuth callback, phone sign-in OTP, or an OAuth session's phone
 * confirmation): syncs the confirmed phone number to the API, then routes
 * the user to the right next step. Always redirects; never returns.
 */
export async function completeSignInRedirect(): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  try {
    await apiFetch('/identity/sync-phone', { method: 'POST' });
  } catch (error) {
    if (isApiProblemError(error) && error.problem.code === 'PHONE_NOT_CONFIRMED') {
      return redirect('/onboarding/phone');
    }
    return redirect('/onboarding/phone?error=sync_failed');
  }

  const me = await getMe();
  if (!me.profile) {
    return redirect('/onboarding/profile');
  }

  return redirect('/trang-chu');
}

/** Revokes every session for this user (all providers, all devices). */
export async function signOutEverywhere(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'global' });
  return redirect('/');
}
