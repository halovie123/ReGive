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
    request.currentUser = {
      id: user.id,
      providerSubject: user.providerSubject,
      phoneVerified: user.phoneVerifiedAt !== null,
    };

    return true;
  }

  private authRequired(): PublicApiException {
    return new PublicApiException(
      HttpStatus.UNAUTHORIZED,
      'AUTH_REQUIRED',
      'Authentication is required.',
    );
  }
}
