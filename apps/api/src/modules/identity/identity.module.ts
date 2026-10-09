import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IdentityVerifier } from './identity-verifier';
import { IDENTITY_USER_STORE } from './identity-user.store';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  JoseRemoteJwtVerifier,
  JwtCryptographicVerifier,
  SupabaseIdentityVerifier,
} from './supabase-identity.verifier';

/**
 * Identity is authentication only: verify the Supabase JWT, map its subject
 * to a local user, refuse suspended accounts. There is no controller — the
 * module's single public surface is JwtAuthGuard.
 *
 * It used to also own phone/OTP verification (VerifiedPhoneGuard, the
 * POST /v1/identity/sync-phone endpoint, a Supabase Admin adapter and
 * AES-256-GCM phone encryption). All of that was removed when phone sign-in
 * was dropped for cost reasons — see docs/superpowers/plans, "Amendments
 * after Plan 1 shipped".
 */
@Module({
  imports: [PrismaModule],
  providers: [
    JwtAuthGuard,
    JoseRemoteJwtVerifier,
    {
      provide: JwtCryptographicVerifier,
      useExisting: JoseRemoteJwtVerifier,
    },
    SupabaseIdentityVerifier,
    { provide: IdentityVerifier, useExisting: SupabaseIdentityVerifier },
    { provide: IDENTITY_USER_STORE, useExisting: PrismaService },
  ],
  exports: [JwtAuthGuard, IdentityVerifier, IDENTITY_USER_STORE],
})
export class IdentityModule {}
