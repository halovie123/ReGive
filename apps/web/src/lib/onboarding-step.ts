import type { MeResponse } from '@buy-nothing/contracts';

export type OnboardingDestination = '/onboarding/profile' | '/trang-chu';

/**
 * Single source of truth for "given this user's /v1/me response, where
 * should they be routed?" Every page/action that needs to decide between
 * the profile step and the fully-onboarded app shell must call this
 * instead of re-deriving the same check locally — that duplication
 * previously let the rules drift out of sync between call sites (see
 * task-5-report.md, Fix round 1, finding 7).
 *
 * Phone/OTP verification was dropped from onboarding entirely (no paid
 * SMS gateway) — sign-in is Google/Facebook OAuth only now. The backend
 * still tracks phoneVerified/phoneLast4 and VerifiedPhoneGuard remains in
 * place, unused by any endpoint today, in case phone verification is
 * reintroduced later.
 */
export function nextOnboardingStep(me: MeResponse): OnboardingDestination {
  if (!me.profile) return '/onboarding/profile';
  return '/trang-chu';
}

/** True once a user has cleared every onboarding step. */
export function isOnboardingComplete(me: MeResponse): boolean {
  return nextOnboardingStep(me) === '/trang-chu';
}
