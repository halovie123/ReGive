import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { PublicApiException } from '../../common/http/public-api.exception';
import type { AuthenticatedRequest } from './identity.types';

@Injectable()
export class VerifiedPhoneGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.currentUser?.phoneVerified) {
      throw new PublicApiException(
        HttpStatus.FORBIDDEN,
        'PHONE_NOT_VERIFIED',
        'A confirmed phone number is required.',
      );
    }

    return true;
  }
}
