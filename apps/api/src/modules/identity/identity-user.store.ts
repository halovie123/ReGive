import type { UserStatus } from '@prisma/client';

export const IDENTITY_USER_STORE = Symbol('IDENTITY_USER_STORE');

export type ProvisionedUser = {
  id: string;
  providerSubject: string;
  phoneVerifiedAt: Date | null;
  /**
   * Account lifecycle state. JwtAuthGuard refuses anything other than
   * ACTIVE, so every route behind the guard inherits suspension.
   */
  status: UserStatus;
};

export interface IdentityUserStore {
  user: {
    upsert(arguments_: {
      where: { providerSubject: string };
      create: { providerSubject: string };
      update: Record<string, never>;
    }): Promise<ProvisionedUser>;
    update(arguments_: {
      where: { id: string };
      data: {
        encryptedPhone: string;
        phoneLast4: string;
        phoneVerifiedAt: Date;
        phoneEncryptionKeyVersion: number;
      };
    }): Promise<{ id: string }>;
  };
}
