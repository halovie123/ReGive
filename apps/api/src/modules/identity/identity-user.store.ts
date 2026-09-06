import type { UserStatus } from '@prisma/client';

export const IDENTITY_USER_STORE = Symbol('IDENTITY_USER_STORE');

export type ProvisionedUser = {
  id: string;
  providerSubject: string;
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
  };
}
