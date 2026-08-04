import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../common/security/encryption.service';
import { IdentityController } from './identity.controller';
import type { CurrentUser } from './identity.types';
import type { AdminIdentityUser } from './supabase-user-admin';
import { SupabaseUserAdmin } from './supabase-user-admin';

const currentUser: CurrentUser = {
  id: 'user-1',
  providerSubject: 'subject-1',
  phoneVerified: false,
};

const encryption = new EncryptionService({
  getOrThrow: () => Buffer.alloc(32, 9).toString('base64'),
} as unknown as ConfigService);

const createController = (adminUser: AdminIdentityUser) => {
  let updateData: Record<string, unknown> | undefined;
  const users = {
    user: {
      update: ({ data }: { data: Record<string, unknown> }) => {
        updateData = data;
        return Promise.resolve({ id: currentUser.id });
      },
    },
  };
  const admin = {
    getUser: () => Promise.resolve(adminUser),
  } as unknown as SupabaseUserAdmin;

  return {
    controller: new IdentityController(admin, encryption, users as never),
    getUpdateData: () => updateData,
  };
};

describe('IdentityController syncPhone', () => {
  it('maps Admin adapter failures to a safe public problem', async () => {
    const admin = {
      getUser: () =>
        Promise.reject(new Error('raw upstream response must-not-leak')),
    } as unknown as SupabaseUserAdmin;
    const controller = new IdentityController(admin, encryption, {
      user: { update: () => Promise.resolve({ id: 'user-1' }) },
    } as never);

    await expect(controller.syncPhone(currentUser)).rejects.toMatchObject({
      status: 502,
      response: {
        code: 'IDENTITY_PROVIDER_UNAVAILABLE',
        message: 'The identity provider is temporarily unavailable.',
      },
    });
  });

  it.each([
    {
      label: 'unconfirmed Admin phone',
      user: {
        subject: 'subject-1',
        phone: '+84912345678',
        phoneConfirmedAt: null,
      },
      code: 'PHONE_NOT_CONFIRMED',
    },
    {
      label: 'missing Admin phone',
      user: {
        subject: 'subject-1',
        phone: null,
        phoneConfirmedAt: new Date('2026-08-04T10:00:00.000Z'),
      },
      code: 'PHONE_NOT_CONFIRMED',
    },
    {
      label: 'malformed Admin phone',
      user: {
        subject: 'subject-1',
        phone: '0912-345-678',
        phoneConfirmedAt: new Date('2026-08-04T10:00:00.000Z'),
      },
      code: 'PHONE_INVALID',
    },
  ])('rejects $label', async ({ user, code }) => {
    const { controller, getUpdateData } = createController(user);

    await expect(controller.syncPhone(currentUser)).rejects.toMatchObject({
      status: 422,
      response: { code },
    });
    expect(getUpdateData()).toBeUndefined();
  });

  it('never trusts a JWT phone claim when Admin has not confirmed it', async () => {
    const { controller } = createController({
      subject: 'subject-1',
      phone: null,
      phoneConfirmedAt: null,
    });

    await expect(
      controller.syncPhone({
        ...currentUser,
        phone: '+84912345678',
        phone_confirmed_at: '2026-08-04T10:00:00.000Z',
      } as CurrentUser),
    ).rejects.toMatchObject({
      response: { code: 'PHONE_NOT_CONFIRMED' },
    });
  });

  it('normalizes, encrypts and stores only safe phone metadata', async () => {
    const fullPhone = '+84 912-345-678';
    const { controller, getUpdateData } = createController({
      subject: 'subject-1',
      phone: fullPhone,
      phoneConfirmedAt: new Date('2026-08-04T10:00:00.000Z'),
    });

    const response = await controller.syncPhone(currentUser);
    const update = getUpdateData();

    expect(response).toEqual({ phoneVerified: true, phoneLast4: '5678' });
    expect(JSON.stringify(response)).not.toContain(fullPhone);
    expect(update).toMatchObject({
      phoneLast4: '5678',
      phoneEncryptionKeyVersion: 1,
      phoneVerifiedAt: new Date('2026-08-04T10:00:00.000Z'),
    });
    expect(update?.encryptedPhone).not.toContain('+84912345678');
    expect(encryption.decrypt(update?.encryptedPhone as string)).toBe(
      '+84912345678',
    );
  });
});
