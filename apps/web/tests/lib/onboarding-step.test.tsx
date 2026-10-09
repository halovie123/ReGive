import type { MeResponse } from '@buy-nothing/contracts';
import { isOnboardingComplete, nextOnboardingStep } from '@/lib/onboarding-step';

const baseMe: MeResponse = {
  id: 'user-1',
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

  /**
   * Phone sign-in is gone, so MeResponse no longer carries any phone field.
   * Routing must depend on the profile alone; a reader looking for the old
   * phone gate should find this instead of re-adding one.
   */
  it('gates on the profile alone, with no phone field in the contract', () => {
    const withProfile: MeResponse = {
      ...baseMe,
      profile: { displayName: 'Lan', bio: '', avatarKey: null },
    };
    expect(nextOnboardingStep(withProfile)).toBe('/trang-chu');
    expect(withProfile).not.toHaveProperty('phoneVerified');
    expect(withProfile).not.toHaveProperty('phoneLast4');
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
