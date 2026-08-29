'use server';

import { redirect } from 'next/navigation';
import {
  UpdateAreasSchema,
  UpdateProfileSchema,
  UpdateRolesSchema,
  type AreaCode,
  type UserRole,
} from '@buy-nothing/contracts';
import type { ProfileActionState } from '@/lib/action-state';
import { apiFetch, isApiProblemError } from '@/lib/api/server-fetch';

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
