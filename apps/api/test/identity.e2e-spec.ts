import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from '../src/common/http/api-exception.filter';
import { IdentityModule } from '../src/modules/identity/identity.module';
import { IdentityVerifier } from '../src/modules/identity/identity-verifier';
import { IDENTITY_USER_STORE } from '../src/modules/identity/identity-user.store';
import { JwtAuthGuard } from '../src/modules/identity/jwt-auth.guard';
import { SupabaseUserAdmin } from '../src/modules/identity/supabase-user-admin';
import { VerifiedPhoneGuard } from '../src/modules/identity/verified-phone.guard';

type MemoryUser = {
  id: string;
  providerSubject: string;
  phoneVerifiedAt: Date | null;
  encryptedPhone?: string;
  phoneLast4?: string;
};

class MemoryIdentityStore {
  readonly users = new Map<string, MemoryUser>();
  readonly user = {
    upsert: ({ where }: { where: { providerSubject: string } }) => {
      const existing = this.users.get(where.providerSubject);
      if (existing) return Promise.resolve(existing);
      const created: MemoryUser = {
        id: `user-${this.users.size + 1}`,
        providerSubject: where.providerSubject,
        phoneVerifiedAt: null,
      };
      this.users.set(where.providerSubject, created);
      return Promise.resolve(created);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: {
        encryptedPhone: string;
        phoneLast4: string;
        phoneVerifiedAt: Date;
      };
    }) => {
      const user = [...this.users.values()].find(({ id }) => id === where.id);
      if (!user) throw new Error('Test user was not provisioned');
      Object.assign(user, data);
      return Promise.resolve({ id: user.id });
    },
  };
}

@Controller('community-probe')
class CommunityProbeController {
  @Get()
  @UseGuards(JwtAuthGuard, VerifiedPhoneGuard)
  probe(): { allowed: true } {
    return { allowed: true };
  }
}

describe('Identity flow (e2e)', () => {
  let app: INestApplication<App>;
  let store: MemoryIdentityStore;

  beforeAll(async () => {
    store = new MemoryIdentityStore();
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              DATABASE_URL:
                'postgresql://unused:unused@127.0.0.1:5432/unused_identity_test',
              SUPABASE_URL: 'https://unused.supabase.co',
              SUPABASE_JWKS_URL:
                'https://unused.supabase.co/auth/v1/.well-known/jwks.json',
              SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
              PII_ENCRYPTION_KEY_V1: Buffer.alloc(32, 3).toString('base64'),
            }),
          ],
        }),
        IdentityModule,
      ],
      controllers: [CommunityProbeController],
    })
      .overrideProvider(IDENTITY_USER_STORE)
      .useValue(store)
      .overrideProvider(IdentityVerifier)
      .useValue({
        verify: (token: string) => {
          if (token !== 'valid-token') {
            return Promise.reject(new Error('invalid test token'));
          }
          return Promise.resolve({
            subject: 'subject-1',
            sessionId: 'session-1',
          });
        },
      })
      .overrideProvider(SupabaseUserAdmin)
      .useValue({
        getUser: (subject: string) =>
          Promise.resolve({
            subject,
            phone: '+84 912-345-678',
            phoneConfirmedAt: new Date('2026-08-04T10:00:00.000Z'),
          }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalFilters(new ApiExceptionFilter({ error: () => undefined }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('uses JWT-only sync to unlock community access without duplicating users', async () => {
    const authorization = { Authorization: 'Bearer valid-token' };

    const blocked = await request(app.getHttpServer())
      .get('/v1/community-probe')
      .set(authorization)
      .set('x-correlation-id', 'identity-before-sync')
      .expect(403);
    expect(blocked.body).toMatchObject({ code: 'PHONE_NOT_VERIFIED' });

    const synced = await request(app.getHttpServer())
      .post('/v1/identity/sync-phone')
      .set(authorization)
      .expect(201);
    expect(synced.body).toEqual({
      phoneVerified: true,
      phoneLast4: '5678',
    });
    expect(JSON.stringify(synced.body)).not.toContain('+84 912-345-678');
    expect(JSON.stringify(synced.body)).not.toContain('+84912345678');

    await request(app.getHttpServer())
      .get('/v1/community-probe')
      .set(authorization)
      .expect(200, { allowed: true });
    await request(app.getHttpServer())
      .post('/v1/identity/sync-phone')
      .set(authorization)
      .expect(201);

    expect([...store.users.keys()]).toEqual(['subject-1']);
  });
});
