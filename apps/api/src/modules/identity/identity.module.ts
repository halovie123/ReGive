import { Module } from '@nestjs/common';
import { EncryptionService } from '../../common/security/encryption.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IdentityController } from './identity.controller';
import { IdentityVerifier } from './identity-verifier';
import { IDENTITY_USER_STORE } from './identity-user.store';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  JoseRemoteJwtVerifier,
  JwtCryptographicVerifier,
  SupabaseIdentityVerifier,
} from './supabase-identity.verifier';
import {
  ADMIN_FETCH,
  ADMIN_REQUEST_SIGNAL_FACTORY,
  type AdminFetch,
  defaultAdminRequestSignalFactory,
  SupabaseUserAdmin,
} from './supabase-user-admin';
import { VerifiedPhoneGuard } from './verified-phone.guard';

const adminFetch: AdminFetch = (url, init) => globalThis.fetch(url, init);

@Module({
  imports: [PrismaModule],
  controllers: [IdentityController],
  providers: [
    EncryptionService,
    JwtAuthGuard,
    VerifiedPhoneGuard,
    JoseRemoteJwtVerifier,
    {
      provide: JwtCryptographicVerifier,
      useExisting: JoseRemoteJwtVerifier,
    },
    SupabaseIdentityVerifier,
    { provide: IdentityVerifier, useExisting: SupabaseIdentityVerifier },
    SupabaseUserAdmin,
    {
      provide: ADMIN_FETCH,
      useValue: adminFetch,
    },
    {
      provide: ADMIN_REQUEST_SIGNAL_FACTORY,
      useValue: defaultAdminRequestSignalFactory,
    },
    { provide: IDENTITY_USER_STORE, useExisting: PrismaService },
  ],
  exports: [
    JwtAuthGuard,
    VerifiedPhoneGuard,
    IdentityVerifier,
    IDENTITY_USER_STORE,
  ],
})
export class IdentityModule {}
