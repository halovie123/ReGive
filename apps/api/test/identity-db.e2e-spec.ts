import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AREA_CODES } from '@buy-nothing/contracts';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from '../src/common/http/api-exception.filter';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { IdentityModule } from '../src/modules/identity/identity.module';
import { IdentityVerifier } from '../src/modules/identity/identity-verifier';
import { JwtAuthGuard } from '../src/modules/identity/jwt-auth.guard';
import { SupabaseUserAdmin } from '../src/modules/identity/supabase-user-admin';
import { VerifiedPhoneGuard } from '../src/modules/identity/verified-phone.guard';

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (runDatabaseTests && !testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required when RUN_DATABASE_TESTS=true');
}

const describeDatabase = runDatabaseTests ? describe : describe.skip;

const assertIsolatedTestDatabase = (databaseUrl: string): void => {
  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!/(?:^|[_-])(test|ci)(?:[_-]|$)/.test(databaseName)) {
    throw new Error(
      'TEST_DATABASE_URL must target an isolated database named with test or ci',
    );
  }
};

@Controller('database-community-probe')
class DatabaseCommunityProbeController {
  @Get()
  @UseGuards(JwtAuthGuard, VerifiedPhoneGuard)
  probe(): { allowed: true } {
    return { allowed: true };
  }
}

describeDatabase('Identity provisioning with PostgreSQL (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let prisma: PrismaService | undefined;
  const providerSubject = `identity-db-${randomUUID()}`;

  beforeAll(async () => {
    assertIsolatedTestDatabase(testDatabaseUrl as string);
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              DATABASE_URL: testDatabaseUrl,
              REDIS_URL: 'redis://127.0.0.1:6379',
              SUPABASE_URL: 'https://unused.supabase.co',
              SUPABASE_JWKS_URL:
                'https://unused.supabase.co/auth/v1/.well-known/jwks.json',
              SUPABASE_ANON_KEY: 'test-anon-key',
              SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
              PII_ENCRYPTION_KEY_V1: Buffer.alloc(32, 11).toString('base64'),
            }),
          ],
        }),
        IdentityModule,
      ],
      controllers: [DatabaseCommunityProbeController],
    })
      .overrideProvider(IdentityVerifier)
      .useValue({
        verify: () =>
          Promise.resolve({
            subject: providerSubject,
            sessionId: `session-${providerSubject}`,
          }),
      })
      .overrideProvider(SupabaseUserAdmin)
      .useValue({
        getUser: () =>
          Promise.resolve({
            subject: providerSubject,
            phone: '+84 912-345-678',
            phoneConfirmedAt: new Date('2026-08-04T10:00:00.000Z'),
          }),
      })
      .compile();

    prisma = moduleRef.get(PrismaService);
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalFilters(new ApiExceptionFilter({ error: () => undefined }));
    await app.init();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { providerSubject } });
    }
    await app?.close();
  });

  it('provisions one persisted user and unlocks verified-phone access', async () => {
    const authorization = { Authorization: 'Bearer database-test-token' };

    await request(app!.getHttpServer())
      .get('/v1/database-community-probe')
      .set(authorization)
      .expect(403)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: 'PHONE_NOT_VERIFIED' });
      });

    const synced = await request(app!.getHttpServer())
      .post('/v1/identity/sync-phone')
      .set(authorization)
      .expect(201);
    expect(synced.body).toEqual({
      phoneVerified: true,
      phoneLast4: '5678',
    });
    expect(JSON.stringify(synced.body)).not.toContain('+84912345678');

    await request(app!.getHttpServer())
      .get('/v1/database-community-probe')
      .set(authorization)
      .expect(200, { allowed: true });
    await request(app!.getHttpServer())
      .post('/v1/identity/sync-phone')
      .set(authorization)
      .expect(201);

    await expect(
      prisma!.user.count({ where: { providerSubject } }),
    ).resolves.toBe(1);
  });

  /**
   * The seed lives in the migrations' INSERT INTO "areas" statements —
   * originally four Hóc Môn communes, then replaced city-wide by
   * 20260905000000_expand_areas_to_hcmc — so this asserts against the real,
   * migrated database. A dropped or altered seed fails here even though the
   * infra-free gate suite (foundation-gate.e2e-spec.ts) hard-codes codes in
   * its in-memory fake and therefore cannot notice.
   */
  it('seeds every Ho Chi Minh City district as an active area via migration', async () => {
    const areas = await prisma!.area.findMany({
      select: { code: true, active: true },
    });

    // Sorted in JS, not by the query: "code" is a Postgres enum column, so
    // ORDER BY sorts by the enum's declaration order rather than
    // alphabetically. What matters here is the exact set, not the order.
    expect(
      [...areas].sort((left, right) => left.code.localeCompare(right.code)),
    ).toEqual(
      [...AREA_CODES]
        .sort((left, right) => left.localeCompare(right))
        .map((code) => ({ code, active: true })),
    );

    // The retired Hóc Môn commune codes must be gone, not merely inactive:
    // 20260905000000 rebuilt the enum without them.
    expect(areas.map((area) => area.code as string)).not.toContain('BA_DIEM');
  });
});
