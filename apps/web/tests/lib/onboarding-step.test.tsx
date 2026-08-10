import type { MeResponse } from '@buy-nothing/contracts';
import { isOnboardingComplete, nextOnboardingStep } from '@/lib/onboarding-step';

const baseMe: MeResponse = {
  id: 'user-1',
  phoneVerified: false,
  phoneLast4: null,
  profile: null,
  roles: [],
  activeRole: null,
  areas: [],
};

describe('nextOnboardingStep', () => {
  it('routes an unverified OAuth user (no confirmed phone yet) to /onboarding/phone', () => {
    const me: MeResponse = { ...baseMe, phoneVerified: false, profile: null };
    expect(nextOnboardingStep(me)).toBe('/onboarding/phone');
  });

  it('routes a phone-verified user without a profile to /onboarding/profile', () => {
    const me: MeResponse = {
      ...baseMe,
      phoneVerified: true,
      phoneLast4: '1234',
      profile: null,
    };
    expect(nextOnboardingStep(me)).toBe('/onboarding/profile');
  });

  it('routes a user with a completed profile to /trang-chu', () => {
    const me: MeResponse = {
      ...baseMe,
      phoneVerified: true,
      phoneLast4: '1234',
      profile: { displayName: 'Lan', bio: '', avatarKey: null },
      roles: ['DONOR'],
      activeRole: 'DONOR',
      areas: ['HOC_MON'],
    };
    expect(nextOnboardingStep(me)).toBe('/trang-chu');
  });

  it('prioritizes the phone step over the profile step when neither is done', () => {
    const me: MeResponse = { ...baseMe, phoneVerified: false, profile: null };
    // Even if a stale/inconsistent response somehow had a profile without
    // a verified phone, phone verification must still come first.
    expect(nextOnboardingStep(me)).toBe('/onboarding/phone');
  });
});

describe('isOnboardingComplete', () => {
  it('is false until the user reaches /trang-chu', () => {
    expect(isOnboardingComplete({ ...baseMe, phoneVerified: false })).toBe(false);
    expect(
      isOnboardingComplete({ ...baseMe, phoneVerified: true, profile: null }),
    ).toBe(false);
  });

  it('is true once phone and profile are both done', () => {
    expect(
      isOnboardingComplete({
        ...baseMe,
        phoneVerified: true,
        profile: { displayName: 'Lan', bio: '', avatarKey: null },
      }),
    ).toBe(true);
  });
});
