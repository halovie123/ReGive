import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { IdentityModule } from '../src/modules/identity/identity.module';
import { ProfilesModule } from '../src/modules/profiles/profiles.module';
import { ProfilesService } from '../src/modules/profiles/profiles.service';

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

const waitForBlockedWaiter = async (
  prisma: PrismaService,
  lockerPid: number,
): Promise<void> => {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const [state] = await prisma.$queryRaw<{ blocked: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE "pid" <> ${lockerPid}
          AND ${lockerPid} = ANY(pg_blocking_pids("pid"))
      ) AS "blocked"
    `;
    if (state?.blocked) return;
    await delay(25);
  }
  throw new Error('Timed out waiting for the profile mutation row lock');
};

describeDatabase('Profile mutation concurrency with PostgreSQL (e2e)', () => {
  let moduleRef: TestingModule | undefined;
  let prisma: PrismaService | undefined;
  let profiles: ProfilesService | undefined;
  let userId: string | undefined;
  const providerSubject = `profiles-db-${randomUUID()}`;

  beforeAll(async () => {
    assertIsolatedTestDatabase(testDatabaseUrl as string);
    moduleRef = await Test.createTestingModule({
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
            }),
          ],
        }),
        IdentityModule,
        ProfilesModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    profiles = moduleRef.get(ProfilesService);
    const user = await prisma!.user.create({
      data: {
        providerSubject,
        activeRole: 'DONOR',
        roleAssignments: {
          create: [{ role: 'DONOR' }, { role: 'VOLUNTEER' }],
        },
      },
      select: { id: true },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { providerSubject } });
    }
    await moduleRef?.close();
  });

  it('does not select a role deleted while the same user mutation waits', async () => {
    let releaseUserLock: () => void = () => undefined;
    const release = new Promise<void>((resolve) => {
      releaseUserLock = resolve;
    });
    let publishLockerPid: (pid: number) => void = () => undefined;
    const userLocked = new Promise<number>((resolve) => {
      publishLockerPid = resolve;
    });

    const lockHolder = prisma!.$transaction(async (transaction) => {
      const [backend] = await transaction.$queryRaw<{ pid: number }[]>`
        SELECT pg_backend_pid() AS "pid"
      `;
      await transaction.$queryRaw`
        SELECT "id"
        FROM "users"
        WHERE "id" = ${userId}::uuid
        FOR UPDATE
      `;
      publishLockerPid(backend.pid);
      await release;
      await transaction.roleAssignment.delete({
        where: {
          userId_role: { userId: userId!, role: 'VOLUNTEER' },
        },
      });
    });

    try {
      const lockerPid = await userLocked;
      const activeRoleOutcome = profiles!
        .updateActiveRole(userId!, 'VOLUNTEER')
        .then(
          () => null,
          (error: unknown) => error,
        );

      await waitForBlockedWaiter(prisma!, lockerPid);
      releaseUserLock();
      await lockHolder;

      await expect(activeRoleOutcome).resolves.toMatchObject({
        status: 422,
        response: { code: 'ROLE_NOT_ASSIGNED' },
      });
      await expect(
        prisma!.user.findUniqueOrThrow({
          where: { id: userId },
          select: {
            activeRole: true,
            roleAssignments: {
              select: { role: true },
              orderBy: { role: 'asc' },
            },
          },
        }),
      ).resolves.toEqual({
        activeRole: 'DONOR',
        roleAssignments: [{ role: 'DONOR' }],
      });
    } finally {
      releaseUserLock();
      await lockHolder.catch(() => undefined);
    }
  });

  /**
   * updateAreas is otherwise only covered by fakes, which cannot show that
   * the areaCode FK to the migration-seeded "areas" table resolves, that
   * the row lock in lockActiveAreas runs against a real enum column, or
   * that replacing a selection actually deletes the previous rows. This
   * exercises the whole round-trip against Postgres.
   */
  it('persists an area selection and replaces it on the next write', async () => {
    const first = await profiles!.updateAreas(userId!, [
      'HOC_MON',
      'QUAN_1',
      'HOC_MON',
    ]);
    expect([...first.areas].sort()).toEqual(['HOC_MON', 'QUAN_1']);
    // Sorted in JS: "area_code" is a Postgres enum, so ORDER BY follows the
    // enum's declaration order, not alphabetical order. The assertion is
    // about which rows persisted, not their order.
    const persisted = await prisma!.userArea.findMany({
      where: { userId },
      select: { areaCode: true },
    });
    expect(
      [...persisted].sort((left, right) =>
        left.areaCode.localeCompare(right.areaCode),
      ),
    ).toEqual([{ areaCode: 'HOC_MON' }, { areaCode: 'QUAN_1' }]);

    const second = await profiles!.updateAreas(userId!, ['QUAN_7']);
    expect(second.areas).toEqual(['QUAN_7']);
    await expect(
      prisma!.userArea.findMany({
        where: { userId },
        select: { areaCode: true },
      }),
    ).resolves.toEqual([{ areaCode: 'QUAN_7' }]);
  });
});
