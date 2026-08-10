'use server';

import { redirect } from 'next/navigation';
import {
  UpdateAreasSchema,
  UpdateProfileSchema,
  UpdateRolesSchema,
  type AreaCode,
  type UserRole,
} from '@buy-nothing/contracts';
import { completeSignInRedirect } from '@/features/auth/auth-actions';
import { mapSupabaseAuthError, type PhoneActionState, type ProfileActionState } from '@/lib/action-state';
import { apiFetch, isApiProblemError } from '@/lib/api/server-fetch';
import { normalizeVietnamesePhone } from '@/lib/phone';
import { createClient } from '@/lib/supabase/server';

/**
 * Step 1 of confirming a phone number on an existing (OAuth) session that
 * doesn't have one yet. Uses Supabase's phone-change flow (updateUser),
 * distinct from the phone *sign-in* flow used on the login page.
 */
export async function requestPhoneChangeOtp(
  _prevState: PhoneActionState,
  formData: FormData,
): Promise<PhoneActionState> {
  const rawPhone = String(formData.get('phone') ?? '');
  const phone = normalizeVietnamesePhone(rawPhone);
  if (!phone) {
    return { status: 'error', message: 'Số điện thoại không hợp lệ. Vui lòng nhập lại.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ phone });
  if (error) {
    return { status: 'error', message: mapSupabaseAuthError(error.message) };
  }

  return { status: 'otp-sent', phone };
}

/** Step 2: verify the phone-change OTP, then hand off to shared routing. */
export async function verifyPhoneChangeOtp(
  _prevState: PhoneActionState,
  formData: FormData,
): Promise<PhoneActionState> {
  const phone = String(formData.get('phone') ?? '');
  const code = String(formData.get('code') ?? '').trim();
  if (!phone || !code) {
    return { status: 'error', message: 'Vui lòng nhập mã xác thực.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token: code,
    type: 'phone_change',
  });
  if (error) {
    return { status: 'error', message: mapSupabaseAuthError(error.message) };
  }

  return await completeSignInRedirect();
}

export type OnboardingProfileInput = {
  displayName: string;
  bio: string;
  roles: UserRole[];
  areas: AreaCode[];
};

/**
 * Final onboarding step: PUTs the profile, roles and areas the user chose,
 * defaults their active role to the first role selected, then redirects to
 * /trang-chu. Always redirects on success; never returns in that case.
 */
export async function submitOnboardingProfile(
  input: OnboardingProfileInput,
): Promise<ProfileActionState> {
  const profile = UpdateProfileSchema.safeParse({
    displayName: input.displayName,
    bio: input.bio,
  });
  const roles = UpdateRolesSchema.safeParse({ roles: input.roles });
  const areas = UpdateAreasSchema.safeParse({ areas: input.areas });

  if (!profile.success || !roles.success || !areas.success) {
    return { status: 'error', message: 'Vui lòng kiểm tra lại thông tin đã nhập.' };
  }

  try {
    // Order matters: (app)/layout.tsx and the onboarding pages treat
    // `me.profile !== null` as "onboarding is complete" (see
    // nextOnboardingStep in lib/onboarding-step.ts). Roles, areas and
    // active-role are PUT first, and profile — the completion gate —
    // last, so a failure partway through never leaves an account marked
    // "done" while still missing roles/areas (which has no recovery UI
    // yet). If this whole call fails, the user simply retries the
    // onboarding form from a still-incomplete state.
    await apiFetch('/me/roles', {
      method: 'PUT',
      body: JSON.stringify(roles.data),
    });
    await apiFetch('/me/areas', {
      method: 'PUT',
      body: JSON.stringify(areas.data),
    });
    await apiFetch('/me/active-role', {
      method: 'PUT',
      body: JSON.stringify({ activeRole: roles.data.roles[0] }),
    });
    await apiFetch('/me/profile', {
      method: 'PUT',
      body: JSON.stringify(profile.data),
    });
  } catch (error) {
    if (isApiProblemError(error)) {
      return { status: 'error', message: error.problem.message };
    }
    return { status: 'error', message: 'Đã xảy ra lỗi. Vui lòng thử lại.' };
  }

  return redirect('/trang-chu');
}
