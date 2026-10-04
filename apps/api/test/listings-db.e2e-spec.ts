import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { IdentityModule } from '../src/modules/identity/identity.module';
import { ListingsModule } from '../src/modules/listings/listings.module';
import { ListingsService } from '../src/modules/listings/listings.service';

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (runDatabaseTests && !testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required when RUN_DATABASE_TESTS=true');
}

const describeDatabase = runDatabaseTests ? describe : describe.skip;

const assertIsolatedTestDatabase = (databaseUrl: string): void => {
  const databaseName = decodeURIComponent(
    new URL(databaseUrl).pathname.replace(/^\//, ''),
  );
  if (!/(?:^|[_-])(test|ci)(?:[_-]|$)/.test(databaseName)) {
    throw new Error(
      'TEST_DATABASE_URL must target an isolated database named with test or ci',
    );
  }
};

const newListing = {
  title: 'Nồi cơm điện 1,8 lít',
  description: 'Nấu vẫn chín đều, đủ dây điện và xửng hấp đi kèm theo máy.',
  defects: 'Lòng nồi trầy nhẹ',
  category: 'HOUSEHOLD',
  condition: 'GOOD',
  areaCode: 'QUAN_8',
} as const;

/**
 * The in-memory fakes cannot show that the area foreign key resolves against
 * the migration-seeded table, that the new enum columns round-trip, or that
 * the migration's CHECK constraints actually bite. This does.
 */
describeDatabase('Listings with PostgreSQL (e2e)', () => {
  let moduleRef: TestingModule | undefined;
  let prisma: PrismaService | undefined;
  let listings: ListingsService | undefined;
  const subjects = [
    `listings-db-${randomUUID()}`,
    `listings-db-${randomUUID()}`,
  ];
  let ownerId: string;
  let otherId: string;

  beforeAll(async () => {
    assertIsolatedTestDatabase(testDatabaseUrl as string);
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              DATABASE_URL: testDatabaseUrl,
              SUPABASE_URL: 'https://unused.supabase.co',
              SUPABASE_JWKS_URL:
                'https://unused.supabase.co/auth/v1/.well-known/jwks.json',
              SUPABASE_ANON_KEY: 'test-anon-key',
            }),
          ],
        }),
        IdentityModule,
        ListingsModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    listings = moduleRef.get(ListingsService);
    const [owner, other] = await Promise.all(
      subjects.map((providerSubject) =>
        prisma!.user.create({
          data: {
            providerSubject,
            roleAssignments: { create: [{ role: 'DONOR' }] },
          },
          select: { id: true },
        }),
      ),
    );
    ownerId = owner.id;
    otherId = other.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { providerSubject: { in: subjects } },
      });
    }
    await moduleRef?.close();
  });

  it('round-trips a listing through create, edit, publish and withdraw', async () => {
    const created = await listings!.create(ownerId, newListing);
    expect(created).toMatchObject({ ...newListing, status: 'DRAFT' });

    await expect(
      listings!.update(ownerId, created.id, { areaCode: 'HOC_MON' }),
    ).resolves.toMatchObject({ areaCode: 'HOC_MON' });
    await expect(listings!.submit(ownerId, created.id)).resolves.toMatchObject({
      status: 'PUBLISHED',
    });
    await expect(
      listings!.update(otherId, created.id, { title: 'Không phải của tôi' }),
    ).rejects.toMatchObject({ publicProblem: { code: 'LISTING_FORBIDDEN' } });
    await expect(
      listings!.withdraw(ownerId, created.id),
    ).resolves.toMatchObject({ status: 'WITHDRAWN' });
  });

  it('answers an unknown listing id as not found under the row lock', async () => {
    await expect(
      listings!.withdraw(ownerId, randomUUID()),
    ).rejects.toMatchObject({ publicProblem: { code: 'LISTING_NOT_FOUND' } });
  });

  it('refuses a PUBLISHED row without publish and expiry dates', async () => {
    const created = await listings!.create(ownerId, newListing);

    await expect(
      prisma!.listing.update({
        where: { id: created.id },
        data: { status: 'PUBLISHED' },
      }),
    ).rejects.toThrow(/listings_published_dates_check/);
  });

  it('refuses a too-short title even from a write path that skips the API', async () => {
    await expect(
      prisma!.listing.create({
        data: { ...newListing, ownerId, title: '  Tủ ' },
      }),
    ).rejects.toThrow(/listings_title_length_check/);
  });

  it('shows a published listing to others only until it expires', async () => {
    const created = await listings!.create(ownerId, newListing);
    await prisma!.listing.update({
      where: { id: created.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await expect(listings!.get(otherId, created.id)).resolves.toMatchObject({
      isOwner: false,
    });

    await prisma!.listing.update({
      where: { id: created.id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    await expect(listings!.get(otherId, created.id)).rejects.toMatchObject({
      publicProblem: { code: 'LISTING_NOT_FOUND' },
    });
  });

  it('stores each screening with its reason codes', async () => {
    const created = await listings!.create(ownerId, {
      ...newListing,
      description: 'Nấu vẫn chín đều, đủ dây điện. Gọi 0909123456 để nhận.',
    });

    await expect(listings!.submit(ownerId, created.id)).resolves.toMatchObject({
      status: 'PENDING_REVIEW',
    });
    await expect(
      prisma!.listingRiskAssessment.findMany({
        where: { listingId: created.id },
        select: { level: true, reasons: true },
      }),
    ).resolves.toEqual([{ level: 'MEDIUM', reasons: ['CONTACT_PHONE'] }]);
  });

  it('sweeps due listings to EXPIRED and nothing else', async () => {
    const due = await listings!.create(ownerId, newListing);
    const live = await listings!.create(ownerId, newListing);
    await prisma!.listing.update({
      where: { id: due.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(Date.now() - 2 * 60_000),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    await listings!.submit(ownerId, live.id);

    await listings!.sweepExpired();
    await listings!.sweepExpired();

    const statuses = await prisma!.listing.findMany({
      where: { id: { in: [due.id, live.id] } },
      select: { id: true, status: true },
    });
    expect(
      Object.fromEntries(statuses.map((row) => [row.id, row.status])),
    ).toEqual({
      [due.id]: 'EXPIRED',
      [live.id]: 'PUBLISHED',
    });
  });
});
