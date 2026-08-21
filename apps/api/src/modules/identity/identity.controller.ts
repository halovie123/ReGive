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
  if (!/^\+[0-9]+(?:[ -][0-9]+)*$/.test(phone)) return null;
  const normalized = phone.replace(/[ -]/g, '');
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
        'Bạn cần xác thực số điện thoại trước khi tiếp tục.',
      );
    }

    const normalizedPhone = normalizePhone(adminUser.phone);
    if (!normalizedPhone) {
      throw new PublicApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'PHONE_INVALID',
        'Số điện thoại đã xác thực không hợp lệ.',
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
        'Hệ thống xác thực đang tạm gián đoạn. Vui lòng thử lại sau.',
      );
    }
  }
}
