import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { AppRole, AreaCode, UserStatus } from '@prisma/client';
import { MeResponseSchema } from '@buy-nothing/contracts';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from '../src/common/http/api-exception.filter';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { IdentityModule } from '../src/modules/identity/identity.module';
import { IdentityVerifier } from '../src/modules/identity/identity-verifier';
import { ProfilesModule } from '../src/modules/profiles/profiles.module';

type StoredUser = {
  id: string;
  providerSubject: string;
  phoneLast4: string | null;
  phoneVerifiedAt: Date | null;
  status: UserStatus;
  activeRole: AppRole | null;
  profile: {
    displayName: string;
    bio: string;
    avatarKey: string | null;
  } | null;
  roles: Set<AppRole>;
  areas: Set<AreaCode>;
};

/**
 * A single in-memory fake standing in for both the Prisma-backed
 * IDENTITY_USER_STORE (which JwtAuthGuard uses to provision users) and
 * PrismaService (which ProfilesService reads/writes). It combines the
 * shapes already exercised separately by identity.e2e-spec.ts,
 * profiles.e2e-spec.ts and profiles.service.spec.ts so the full
 * provisioning -> onboarding flow can run without a real database,
 * matching this suite's infra-free convention (`test:e2e`, not
 * `test:e2e:db`).
 */
class MemoryFoundationDatabase {
  private readonly users = new Map<string, StoredUser>();
  private readonly activeAreas = new Map<AreaCode, boolean>([
    ['HOC_MON', true],
    ['QUAN_1', true],
    ['QUAN_3', true],
    ['QUAN_7', true],
  ]);

  get provisionedUserCount(): number {
    return this.users.size;
  }

  readonly user = {
    upsert: ({
      where: { providerSubject },
    }: {
      where: { providerSubject: string };
    }) => {
      const existing = [...this.users.values()].find(
        (candidate) => candidate.providerSubject === providerSubject,
      );
      if (existing) return Promise.resolve(existing);
      const created: StoredUser = {
        id: `user-${this.users.size + 1}`,
        providerSubject,
        phoneLast4: null,
        phoneVerifiedAt: null,
        status: 'ACTIVE',
        activeRole: null,
        profile: null,
        roles: new Set(),
        areas: new Set(),
      };
      this.users.set(created.id, created);
      return Promise.resolve(created);
    },
    findUniqueOrThrow: ({ where: { id } }: { where: { id: string } }) =>
      Promise.resolve(this.serialize(this.userFor(id))),
    update: ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: { activeRole?: AppRole | null };
    }) => {
      const user = this.userFor(id);
      if ('activeRole' in data) user.activeRole = data.activeRole ?? null;
      return Promise.resolve(this.serialize(user));
    },
  };

  readonly profile = {
    upsert: ({
      where: { userId },
      create,
      update,
    }: {
      where: { userId: string };
      create: { displayName: string; bio: string; userId: string };
      update: { displayName: string; bio: string };
    }) => {
      const user = this.userFor(userId);
      user.profile = {
        displayName: user.profile ? update.displayName : create.displayName,
        bio: user.profile ? update.bio : create.bio,
        avatarKey: user.profile?.avatarKey ?? null,
      };
      return Promise.resolve(user.profile);
    },
  };

  readonly roleAssignment = {
    deleteMany: ({ where: { userId } }: { where: { userId: string } }) => {
      this.userFor(userId).roles.clear();
      return Promise.resolve({ count: 1 });
    },
    createMany: ({
      data,
    }: {
      data: { userId: string; role: AppRole }[];
      skipDuplicates: boolean;
    }) => {
      const user = this.userFor(data[0].userId);
      data.forEach(({ role }) => user.roles.add(role));
      return Promise.resolve({ count: user.roles.size });
    },
    findUnique: ({
      where: { userId_role },
    }: {
      where: { userId_role: { userId: string; role: AppRole } };
    }) => {
      const { userId, role } = userId_role;
      return Promise.resolve(
        this.userFor(userId).roles.has(role) ? { role } : null,
      );
    },
  };

  readonly userArea = {
    deleteMany: ({ where: { userId } }: { where: { userId: string } }) => {
      this.userFor(userId).areas.clear();
      return Promise.resolve({ count: 1 });
    },
    createMany: ({
      data,
    }: {
      data: { userId: string; areaCode: AreaCode }[];
      skipDuplicates: boolean;
    }) => {
      const user = this.userFor(data[0].userId);
      data.forEach(({ areaCode }) => user.areas.add(areaCode));
      return Promise.resolve({ count: user.areas.size });
    },
  };

  $queryRaw = (
    query: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<unknown[]> => {
    if (query.join('?').includes('FROM "areas"')) {
      const areaCode = values[0] as AreaCode;
      return Promise.resolve(
        this.activeAreas.get(areaCode) === true ? [{ code: areaCode }] : [],
      );
    }
    return Promise.resolve([{ id: values[0] }]);
  };

  $transaction = async <T>(
    operation: (transaction: this) => Promise<T>,
  ): Promise<T> => operation(this);

  private userFor(id: string): StoredUser {
    const user = this.users.get(id);
    if (!user) throw new Error('Test user was not provisioned');
    return user;
  }

  private serialize(user: StoredUser) {
    return {
      id: user.id,
      phoneLast4: user.phoneLast4,
      phoneVerifiedAt: user.phoneVerifiedAt,
      activeRole: user.activeRole,
      profile: user.profile,
      roleAssignments: [...user.roles].sort().map((role) => ({ role })),
      areaAssignments: [...user.areas].sort().map((areaCode) => ({ areaCode })),
    };
  }
}

describe('Foundation identity release gate (e2e)', () => {
  let app: INestApplication<App>;
  let database: MemoryFoundationDatabase;

  beforeAll(async () => {
    database = new MemoryFoundationDatabase();
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              DATABASE_URL:
                'postgresql://unused:unused@127.0.0.1:5432/unused_gate_test',
              SUPABASE_URL: 'https://unused.supabase.co',
              SUPABASE_JWKS_URL:
                'https://unused.supabase.co/auth/v1/.well-known/jwks.json',
              SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
              PII_ENCRYPTION_KEY_V1: Buffer.alloc(32, 6).toString('base64'),
            }),
          ],
        }),
        AppModule,
        IdentityModule,
        ProfilesModule,
      ],
    })
      .overrideProvider(IdentityVerifier)
      .useValue({
        verify: (token: string) =>
          token === 'gate-token'
            ? Promise.resolve({
                subject: 'gate-subject',
                sessionId: 'gate-session',
              })
            : Promise.reject(new Error('invalid test token')),
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

  it('provisions identity from a JWT alone and completes onboarding end to end', async () => {
    const authorization = { Authorization: 'Bearer gate-token' };

    await request(app.getHttpServer())
      .get('/v1/health')
      .expect(200, { status: 'ok' });

    const provisioned = await request(app.getHttpServer())
      .get('/v1/me')
      .set(authorization)
      .expect(200);
    expect(provisioned.body).toMatchObject({
      phoneVerified: false,
      phoneLast4: null,
      profile: null,
      roles: [],
      activeRole: null,
      areas: [],
    });
    const provisionedBody = provisioned.body as { id: string };
    const userId = provisionedBody.id;
    expect(typeof userId).toBe('string');
    expect(userId.length).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .put('/v1/me/profile')
      .set(authorization)
      .send({
        displayName: 'Nguyễn Thị Lan',
        bio: 'Thích chia sẻ đồ dùng cho hàng xóm ở Hóc Môn.',
      })
      .expect(200);

    await request(app.getHttpServer())
      .put('/v1/me/roles')
      .set(authorization)
      .send({ roles: ['DONOR', 'RECIPIENT', 'VOLUNTEER'] })
      .expect(200);

    await request(app.getHttpServer())
      .put('/v1/me/active-role')
      .set(authorization)
      .send({ activeRole: 'VOLUNTEER' })
      .expect(200);

    await request(app.getHttpServer())
      .put('/v1/me/areas')
      .set(authorization)
      .send({ areas: ['HOC_MON', 'QUAN_1'] })
      .expect(200);

    const complete = await request(app.getHttpServer())
      .get('/v1/me')
      .set(authorization)
      .expect(200);

    const me = MeResponseSchema.parse(complete.body);
    // Roles/areas are compared order-independently: the contract makes no
    // ordering guarantee, only that the exact set was persisted.
    expect({
      ...me,
      roles: [...me.roles].sort(),
      areas: [...me.areas].sort(),
    }).toEqual({
      id: userId,
      phoneVerified: false,
      phoneLast4: null,
      profile: {
        displayName: 'Nguyễn Thị Lan',
        bio: 'Thích chia sẻ đồ dùng cho hàng xóm ở Hóc Môn.',
        avatarKey: null,
      },
      roles: ['DONOR', 'RECIPIENT', 'VOLUNTEER'].sort(),
      activeRole: 'VOLUNTEER',
      areas: ['HOC_MON', 'QUAN_1'],
    });

    // A JWT-only identity sync followed by five more authenticated calls
    // for the same subject must still resolve to exactly one user.
    expect(database.provisionedUserCount).toBe(1);
  });
});
