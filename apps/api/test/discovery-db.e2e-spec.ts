import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { DiscoveryQuery } from '@buy-nothing/contracts';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { DiscoveryModule } from '../src/modules/discovery/discovery.module';
import { DiscoveryService } from '../src/modules/discovery/discovery.service';
import { IdentityModule } from '../src/modules/identity/identity.module';
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

/**
 * Discovery is one SQL query; only a real database can show that the
 * cursor neither repeats nor skips rows, that search is accent-insensitive
 * through the GIN-indexed expression, and that nothing non-public leaks.
 * Every listing here carries a per-run token so other suites' rows in the
 * shared CI database cannot affect the counts.
 */
describeDatabase('Discovery with PostgreSQL (e2e)', () => {
  let moduleRef: TestingModule | undefined;
  let prisma: PrismaService | undefined;
  let discovery: DiscoveryService | undefined;
  let listings: ListingsService | undefined;
  const token = `zq${randomUUID().slice(0, 8)}`;
  const subjects = [`discovery-${randomUUID()}`, `discovery-${randomUUID()}`];
  let donorId: string;
  let suspendedDonorId: string;

  const query = (overrides: Partial<DiscoveryQuery> = {}): DiscoveryQuery => ({
    q: token,
    limit: 20,
    ...overrides,
  });

  const publish = async (
    ownerId: string,
    fields: Partial<{
      title: string;
      category: 'HOUSEHOLD' | 'CLOTHING' | 'BOOKS' | 'CHILDREN' | 'DEVICES';
      condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
      areaCode: 'HOC_MON' | 'QUAN_1' | 'GO_VAP';
    }> = {},
  ) => {
    const created = await listings!.create(ownerId, {
      title: `${fields.title ?? 'Bàn học gỗ'} ${token}`,
      description: 'Còn chắc chắn, phù hợp cho học sinh tiểu học dùng ở nhà.',
      defects: 'Trầy nhẹ mặt bàn',
      category: fields.category ?? 'HOUSEHOLD',
      condition: fields.condition ?? 'GOOD',
      areaCode: fields.areaCode ?? 'HOC_MON',
    });
    const published = await listings!.submit(ownerId, created.id);
    expect(published.status).toBe('PUBLISHED');
    return created.id;
  };

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
        DiscoveryModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    discovery = moduleRef.get(DiscoveryService);
    listings = moduleRef.get(ListingsService);
    const [donor, suspended] = await Promise.all(
      subjects.map((providerSubject, index) =>
        prisma!.user.create({
          data: {
            providerSubject,
            roleAssignments: { create: [{ role: 'DONOR' }] },
            profile: {
              create: { displayName: index === 0 ? 'Lan' : 'Bị khoá' },
            },
          },
          select: { id: true },
        }),
      ),
    );
    donorId = donor.id;
    suspendedDonorId = suspended.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { providerSubject: { in: subjects } },
      });
    }
    await moduleRef?.close();
  });

  afterEach(async () => {
    await prisma!.listing.deleteMany({
      where: { ownerId: { in: [donorId, suspendedDonorId] } },
    });
  });

  it('pages through listings published in the same millisecond without repeats or gaps', async () => {
    const ids = await Promise.all(
      Array.from({ length: 5 }, () => publish(donorId)),
    );
    await prisma!.listing.updateMany({
      where: { id: { in: ids } },
      data: { publishedAt: new Date('2026-10-04T08:00:00.000Z') },
    });

    const seen: string[] = [];
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await discovery!.listings(query({ limit: 2, cursor }));
      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor ?? undefined;
      pages += 1;
    } while (cursor && pages < 10);

    expect(pages).toBe(3);
    expect(new Set(seen).size).toBe(5);
    expect([...seen].sort()).toEqual([...ids].sort());
  });

  it('puts the newest listing first', async () => {
    const older = await publish(donorId, { title: 'Ghế cũ' });
    const newer = await publish(donorId, { title: 'Ghế mới' });
    await prisma!.listing.update({
      where: { id: older },
      data: { publishedAt: new Date(Date.now() - 60_000) },
    });

    const page = await discovery!.listings(query());

    expect(page.items.map((item) => item.id)).toEqual([newer, older]);
  });

  it('finds "sách" when searched without accents, and the reverse', async () => {
    const book = await publish(donorId, {
      title: 'Sách giáo khoa lớp 5',
      category: 'BOOKS',
    });

    for (const q of [`sach giao khoa ${token}`, `Sách Giáo Khoa ${token}`]) {
      const page = await discovery!.listings(query({ q }));
      expect(page.items.map((item) => item.id)).toEqual([book]);
    }
    await expect(
      discovery!.listings(query({ q: `truyen tranh ${token}` })),
    ).resolves.toMatchObject({ items: [] });
  });

  it('combines area, category and condition filters', async () => {
    const match = await publish(donorId, {
      category: 'BOOKS',
      areaCode: 'GO_VAP',
      condition: 'LIKE_NEW',
    });
    await publish(donorId, { category: 'BOOKS', areaCode: 'QUAN_1' });
    await publish(donorId, { category: 'CLOTHING', areaCode: 'GO_VAP' });
    await publish(donorId, {
      category: 'BOOKS',
      areaCode: 'GO_VAP',
      condition: 'FAIR',
    });

    const page = await discovery!.listings(
      query({ area: 'GO_VAP', category: 'BOOKS', condition: 'LIKE_NEW' }),
    );

    expect(page.items.map((item) => item.id)).toEqual([match]);
  });

  it('shows only public listings by active members', async () => {
    const visible = await publish(donorId);
    const draft = await listings!.create(donorId, {
      title: `Bản nháp ${token}`,
      description: 'Chưa đăng, không ai được thấy bài này ngoài chủ bài.',
      defects: 'Không có',
      category: 'HOUSEHOLD',
      condition: 'GOOD',
      areaCode: 'HOC_MON',
    });
    const expired = await publish(donorId);
    await prisma!.listing.update({
      where: { id: expired },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const withdrawn = await publish(donorId);
    await listings!.withdraw(donorId, withdrawn);
    const bySuspended = await publish(suspendedDonorId);
    await prisma!.user.update({
      where: { id: suspendedDonorId },
      data: { status: 'SUSPENDED' },
    });

    const page = await discovery!.listings(query());

    expect(page.items.map((item) => item.id)).toEqual([visible]);
    expect([draft.id, expired, withdrawn, bySuspended]).not.toContain(
      page.items[0]?.id,
    );
    await prisma!.user.update({
      where: { id: suspendedDonorId },
      data: { status: 'ACTIVE' },
    });
  });

  it('describes the donor by display name only', async () => {
    await publish(donorId);

    const [item] = (await discovery!.listings(query())).items;

    expect(item.owner).toEqual({ displayName: 'Lan', avatarKey: null });
    expect(JSON.stringify(item)).not.toContain(donorId);
    expect(JSON.stringify(item)).not.toContain(subjects[0]);
  });

  it('rejects a cursor it did not issue', async () => {
    await expect(
      discovery!.listings(query({ cursor: 'forged' })),
    ).rejects.toMatchObject({ publicProblem: { code: 'INVALID_INPUT' } });
  });

  it('counts visible listings for every active area, zero included', async () => {
    const before = await discovery!.areaCounts();
    await publish(donorId, { areaCode: 'GO_VAP' });
    await publish(donorId, { areaCode: 'GO_VAP' });
    const hidden = await publish(donorId, { areaCode: 'GO_VAP' });
    await listings!.withdraw(donorId, hidden);

    const after = await discovery!.areaCounts();
    const count = (counts: typeof after, area: string) =>
      counts.find((entry) => entry.areaCode === area)?.count ?? -1;

    expect(after).toHaveLength(22);
    expect(count(after, 'GO_VAP') - count(before, 'GO_VAP')).toBe(2);
    expect(after.map((entry) => entry.areaCode)[0]).toBe('QUAN_1');
  });

  it('has the full-text index the search expression relies on', async () => {
    const indexes = await prisma!.$queryRaw<{ indexdef: string }[]>`
      SELECT "indexdef" FROM "pg_indexes"
      WHERE "tablename" = 'listings'
        AND "indexname" = 'listings_search_text_fts_idx'
    `;

    expect(indexes).toHaveLength(1);
    expect(indexes[0].indexdef).toContain(
      "to_tsvector('simple'::regconfig, search_text)",
    );
  });
});
