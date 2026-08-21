import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { UserStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from '../src/common/http/api-exception.filter';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { IdentityModule } from '../src/modules/identity/identity.module';
import { IdentityVerifier } from '../src/modules/identity/identity-verifier';
import { ProfilesModule } from '../src/modules/profiles/profiles.module';

class MemoryOnboardingDatabase {
  private readonly users = new Map<
    string,
    {
      id: string;
      providerSubject: string;
      phoneVerifiedAt: Date | null;
      status: UserStatus;
    }
  >();

  readonly user = {
    upsert: ({
      where: { providerSubject },
    }: {
      where: { providerSubject: string };
    }) => {
      const existing = this.users.get(providerSubject);
      if (existing) return Promise.resolve(existing);
      const created = {
        id: `user-${this.users.size + 1}`,
        providerSubject,
        phoneVerifiedAt: null,
        status: 'ACTIVE' as const,
      };
      this.users.set(providerSubject, created);
      return Promise.resolve(created);
    },
    findUniqueOrThrow: ({ where: { id } }: { where: { id: string } }) => {
      const user = [...this.users.values()].find(
        (candidate) => candidate.id === id,
      );
      if (!user)
        return Promise.reject(new Error('Test user was not provisioned'));
      return Promise.resolve({
        id: user.id,
        phoneLast4: null,
        phoneVerifiedAt: user.phoneVerifiedAt,
        activeRole: null,
        profile: null,
        roleAssignments: [],
        areaAssignments: [],
      });
    },
  };
}

describe('Profile onboarding API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const database = new MemoryOnboardingDatabase();
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              DATABASE_URL:
                'postgresql://unused:unused@127.0.0.1:5432/unused_profile_test',
              SUPABASE_URL: 'https://unused.supabase.co',
              SUPABASE_JWKS_URL:
                'https://unused.supabase.co/auth/v1/.well-known/jwks.json',
              SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
              PII_ENCRYPTION_KEY_V1: Buffer.alloc(32, 3).toString('base64'),
            }),
          ],
        }),
        IdentityModule,
        ProfilesModule,
      ],
    })
      .overrideProvider(IdentityVerifier)
      .useValue({
        verify: (token: string) =>
          token === 'valid-token'
            ? Promise.resolve({
                subject: 'profile-subject',
                sessionId: 'session-1',
              })
            : Promise.reject(new Error('invalid token')),
      })
      .overrideProvider(PrismaService)
      .useValue(database)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalFilters(new ApiExceptionFilter({ error: () => undefined }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('requires JWT authentication for onboarding endpoints', async () => {
    await request(app.getHttpServer())
      .get('/v1/me')
      .expect(401)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: 'AUTH_REQUIRED' });
      });
  });

  it('accepts authenticated onboarding before phone verification and rejects malformed areas safely', async () => {
    const authorization = { Authorization: 'Bearer valid-token' };
    const incomplete = await request(app.getHttpServer())
      .get('/v1/me')
      .set(authorization)
      .expect(200);

    expect(incomplete.body).toMatchObject({
      phoneVerified: false,
      phoneLast4: null,
      profile: null,
      roles: [],
      areas: [],
    });

    const invalid = await request(app.getHttpServer())
      .put('/v1/me/areas')
      .set(authorization)
      .send({ areas: ['DISTRICT_1'] })
      .expect(422);
    expect(invalid.body).toMatchObject({ code: 'INVALID_INPUT' });
    expect(JSON.stringify(invalid.body)).not.toContain('ZodError');
  });
});
