import { redirect } from 'next/navigation';
import { submitOnboardingProfile } from '@/features/onboarding/onboarding-actions';
import { apiFetch } from '@/lib/api/server-fetch';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/api/server-fetch', () => ({
  apiFetch: vi.fn(async () => ({})),
  isApiProblemError: vi.fn(() => false),
}));

vi.mock('@/features/auth/auth-actions', () => ({
  completeSignInRedirect: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);
const redirectMock = vi.mocked(redirect);

const validInput = {
  displayName: 'Lan',
  bio: '',
  roles: ['DONOR'] as const,
  areas: ['HOC_MON'] as const,
};

describe('submitOnboardingProfile', () => {
  beforeEach(() => {
    apiFetchMock.mockClear();
    redirectMock.mockClear();
  });

  it('PUTs roles, areas and active-role before profile, so a partial failure never marks onboarding done without them', async () => {
    await submitOnboardingProfile({
      ...validInput,
      roles: [...validInput.roles],
      areas: [...validInput.areas],
    });

    const calledPaths = apiFetchMock.mock.calls.map(([path]) => path);
    expect(calledPaths).toEqual(['/me/roles', '/me/areas', '/me/active-role', '/me/profile']);
  });

  it('redirects to /trang-chu once every PUT has succeeded', async () => {
    await submitOnboardingProfile({
      ...validInput,
      roles: [...validInput.roles],
      areas: [...validInput.areas],
    });

    expect(redirectMock).toHaveBeenCalledWith('/trang-chu');
  });

  it('stops before writing the profile, and does not redirect, when an earlier PUT fails', async () => {
    apiFetchMock
      .mockResolvedValueOnce({}) // /me/roles succeeds
      .mockRejectedValueOnce(new Error('areas endpoint unreachable')); // /me/areas fails

    const result = await submitOnboardingProfile({
      ...validInput,
      roles: [...validInput.roles],
      areas: [...validInput.areas],
    });

    expect(result?.status).toBe('error');
    expect(redirectMock).not.toHaveBeenCalled();
    const calledPaths = apiFetchMock.mock.calls.map(([path]) => path);
    expect(calledPaths).not.toContain('/me/profile');
  });
});
