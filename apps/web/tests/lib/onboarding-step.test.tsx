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
  it('routes a user without a profile to /onboarding/profile', () => {
    const me: MeResponse = { ...baseMe, profile: null };
    expect(nextOnboardingStep(me)).toBe('/onboarding/profile');
  });

  it('routes a user with a completed profile to /trang-chu', () => {
    const me: MeResponse = {
      ...baseMe,
      profile: { displayName: 'Lan', bio: '', avatarKey: null },
      roles: ['DONOR'],
      activeRole: 'DONOR',
      areas: ['HOC_MON'],
    };
    expect(nextOnboardingStep(me)).toBe('/trang-chu');
  });

  it('ignores phoneVerified entirely (phone/OTP sign-in was removed)', () => {
    const withProfile: MeResponse = {
      ...baseMe,
      phoneVerified: false,
      profile: { displayName: 'Lan', bio: '', avatarKey: null },
    };
    expect(nextOnboardingStep(withProfile)).toBe('/trang-chu');
  });
});

describe('isOnboardingComplete', () => {
  it('is false until the user has a profile', () => {
    expect(isOnboardingComplete(baseMe)).toBe(false);
  });

  it('is true once the profile is set', () => {
    expect(
      isOnboardingComplete({
        ...baseMe,
        profile: { displayName: 'Lan', bio: '', avatarKey: null },
      }),
    ).toBe(true);
  });
});
