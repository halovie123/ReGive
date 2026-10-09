import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { PublicApiException } from '../../common/http/public-api.exception';
import { IdentityVerifier } from './identity-verifier';
import {
  IDENTITY_USER_STORE,
  type IdentityUserStore,
} from './identity-user.store';
import type { AuthenticatedRequest } from './identity.types';

const BEARER_TOKEN = /^Bearer ([^\s,]+)$/i;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly verifier: IdentityVerifier,
    @Inject(IDENTITY_USER_STORE)
    private readonly users: IdentityUserStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match =
      typeof authorization === 'string'
        ? BEARER_TOKEN.exec(authorization)
        : null;

    if (!match?.[1]) throw this.authRequired();

    let subject: string;
    try {
      const claims = await this.verifier.verify(match[1]);
      if (!claims.subject.trim() || !claims.sessionId.trim()) {
        throw new Error('Required identity claim is absent');
      }
      subject = claims.subject;
    } catch {
      throw this.authRequired();
    }

    const user = await this.users.user.upsert({
      where: { providerSubject: subject },
      create: { providerSubject: subject },
      update: {},
    });

    // Every community module inherits this guard, so account lockout is
    // enforced here once rather than being re-implemented per route. A
    // valid token for a SUSPENDED or DEACTIVATED account gets 403, not 401:
    // the credential is genuine, the account simply may not act.
    if (user.status !== 'ACTIVE') {
      throw new PublicApiException(
        HttpStatus.FORBIDDEN,
        'ACCOUNT_SUSPENDED',
        'Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ bộ phận hỗ trợ.',
      );
    }

    request.currentUser = {
      id: user.id,
      providerSubject: user.providerSubject,
    };

    return true;
  }

  private authRequired(): PublicApiException {
    return new PublicApiException(
      HttpStatus.UNAUTHORIZED,
      'AUTH_REQUIRED',
      'Bạn cần đăng nhập để tiếp tục.',
    );
  }
}
