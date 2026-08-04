export const IDENTITY_USER_STORE = Symbol('IDENTITY_USER_STORE');

export type ProvisionedUser = {
  id: string;
  providerSubject: string;
  phoneVerifiedAt: Date | null;
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
