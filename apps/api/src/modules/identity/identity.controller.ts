import {
  Controller,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PublicApiException } from '../../common/http/public-api.exception';
import { EncryptionService } from '../../common/security/encryption.service';
import { CurrentUser as CurrentUserParameter } from './current-user.decorator';
import {
  IDENTITY_USER_STORE,
  type IdentityUserStore,
} from './identity-user.store';
import type { CurrentUser } from './identity.types';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SupabaseUserAdmin } from './supabase-user-admin';

export type SyncPhoneResponse = {
  phoneVerified: true;
  phoneLast4: string;
};

const normalizePhone = (phone: string): string | null => {
  const normalized = phone.replace(/[\s().-]/g, '');
  return /^\+[0-9]{8,15}$/.test(normalized) ? normalized : null;
};

@Controller('identity')
export class IdentityController {
  constructor(
    private readonly admin: SupabaseUserAdmin,
    private readonly encryption: EncryptionService,
    @Inject(IDENTITY_USER_STORE)
    private readonly users: IdentityUserStore,
  ) {}

  @Post('sync-phone')
  @UseGuards(JwtAuthGuard)
  async syncPhone(
    @CurrentUserParameter() currentUser: CurrentUser,
  ): Promise<SyncPhoneResponse> {
    const adminUser = await this.getAdminUser(currentUser.providerSubject);
    if (!adminUser.phone || !adminUser.phoneConfirmedAt) {
      throw new PublicApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'PHONE_NOT_CONFIRMED',
        'A confirmed phone number is required.',
      );
    }

    const normalizedPhone = normalizePhone(adminUser.phone);
    if (!normalizedPhone) {
      throw new PublicApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'PHONE_INVALID',
        'The confirmed phone number is invalid.',
      );
    }

    const phoneLast4 = normalizedPhone.slice(-4);
    await this.users.user.update({
      where: { id: currentUser.id },
      data: {
        encryptedPhone: this.encryption.encrypt(normalizedPhone),
        phoneLast4,
        phoneVerifiedAt: adminUser.phoneConfirmedAt,
        phoneEncryptionKeyVersion: 1,
      },
    });

    return { phoneVerified: true, phoneLast4 };
  }

  private async getAdminUser(subject: string) {
    try {
      return await this.admin.getUser(subject);
    } catch {
      throw new PublicApiException(
        HttpStatus.BAD_GATEWAY,
        'IDENTITY_PROVIDER_UNAVAILABLE',
        'The identity provider is temporarily unavailable.',
      );
    }
  }
}
