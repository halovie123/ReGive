import { ExecutionContext } from '@nestjs/common';
import { PublicApiException } from '../../common/http/public-api.exception';
import { VerifiedPhoneGuard } from './verified-phone.guard';

const contextWithCurrentUser = (phoneVerified: boolean): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        currentUser: {
          id: 'user-1',
          providerSubject: 'subject-1',
          phoneVerified,
        },
      }),
    }),
  }) as ExecutionContext;

describe('VerifiedPhoneGuard', () => {
  const guard = new VerifiedPhoneGuard();

  it('rejects community access when local phone verification is absent', () => {
    try {
      guard.canActivate(contextWithCurrentUser(false));
      throw new Error('Expected guard to reject unverified phone');
    } catch (error) {
      expect(error).toBeInstanceOf(PublicApiException);
      expect((error as PublicApiException).getResponse()).toMatchObject({
        code: 'PHONE_NOT_VERIFIED',
      });
    }
  });

  it('allows community access after local phone verification', () => {
    expect(guard.canActivate(contextWithCurrentUser(true))).toBe(true);
  });
});
