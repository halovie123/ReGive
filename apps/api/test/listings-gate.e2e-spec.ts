import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from '../src/common/http/api-exception.filter';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { DiscoveryModule } from '../src/modules/discovery/discovery.module';
import { IdentityModule } from '../src/modules/identity/identity.module';
import { IdentityVerifier } from '../src/modules/identity/identity-verifier';
import { ListingsModule } from '../src/modules/listings/listings.module';
import { ProfilesModule } from '../src/modules/profiles/profiles.module';

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (runDatabaseTests && !testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required when RUN_DATABASE_TESTS=true');
}

const describeDatabase = runDatabaseTests ? describe : describe.skip;

/**
 * Plan 2 release gate. The only suite that goes through HTTP *and* real
 * Postgres: every other listings test uses either an in-memory database or
 * calls services directly. Only the token verifier is stubbed; members are
 * provisioned by JwtAuthGuard and onboarded through /v1/me like real ones.
 */
describeDatabase('Listings and discovery release gate (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);
  const token = `gate${run}`;
  const subjects = { donor: `gate-donor-${run}`, finder: `gate-finder-${run}` };

  const as = (who: keyof typeof subjects) => ({
    Authorization: `Bearer ${who}-${run}`,
  });
  const http = () => request(app.getHttpServer());

  const listing = (overrides: Record<string, string> = {}) => ({
    title: `Xe đạp trẻ em 16 inch ${token}`,
    description:
      'Xe còn chạy tốt, phù hợp bé 4 đến 6 tuổi, có bánh phụ đi kèm.',
    defects: 'Yên hơi bạc màu',
    category: 'CHILDREN',
    condition: 'GOOD',
    areaCode: 'GO_VAP',
    ...overrides,
  });

  const createAndPublish = async (overrides: Record<string, string> = {}) => {
    const created = await http()
      .post('/v1/listings')
      .set(as('donor'))
      .send(listing(overrides))
      .expect(201);
    const id = (created.body as { id: string }).id;
    const published = await http()
      .post(`/v1/listings/${id}/publish`)
      .set(as('donor'))
      .expect(200);
    return { id, status: (published.body as { status: string }).status };
  };

  const discover = async (search: string) => {
    const response = await http()
      .get(`/v1/discovery/listings?q=${token}&${search}`)
      .set(as('finder'))
      .expect(200);
    return response.body as {
      items: { id: string; owner: unknown }[];
      nextCursor: string | null;
    };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
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
        ProfilesModule,
        ListingsModule,
        DiscoveryModule,
      ],
    })
      .overrideProvider(IdentityVerifier)
      .useValue({
        verify: (bearer: string) => {
          const who = (Object.keys(subjects) as (keyof typeof subjects)[]).find(
            (key) => bearer === `${key}-${run}`,
          );
          return who
            ? Promise.resolve({ subject: subjects[who], sessionId: 'gate' })
            : Promise.reject(new Error('invalid token'));
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalFilters(new ApiExceptionFilter({ error: () => undefined }));
    await app.init();
    prisma = moduleRef.get(PrismaService);

    for (const [who, roles] of [
      ['donor', ['DONOR']],
      ['finder', ['RECIPIENT']],
    ] as const) {
      await http().put('/v1/me/roles').set(as(who)).send({ roles }).expect(200);
      await http()
        .put('/v1/me/areas')
        .set(as(who))
        .send({ areas: ['GO_VAP'] })
        .expect(200);
      await http()
        .put('/v1/me/profile')
        .set(as(who))
        .send({ displayName: who === 'donor' ? 'Lan' : 'Minh' })
        .expect(200);
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { providerSubject: { in: Object.values(subjects) } },
      });
    }
    await app?.close();
  });

  it('lets a donor publish a safe listing that another member then finds', async () => {
    const { id, status } = await createAndPublish();
    expect(status).toBe('PUBLISHED');

    const page = await discover('area=GO_VAP&category=CHILDREN');

    expect(page.items.map((item) => item.id)).toContain(id);
    const found = page.items.find((item) => item.id === id);
    expect(found?.owner).toEqual({ displayName: 'Lan', avatarKey: null });
    expect(JSON.stringify(page)).not.toContain(subjects.donor);
    await http().get(`/v1/listings/${id}`).set(as('finder')).expect(200);
  });

  it('holds a listing with a phone number and keeps it out of discovery', async () => {
    const { id, status } = await createAndPublish({
      description:
        'Xe còn chạy tốt, ai cần gọi 0909123456 để nhận trong tuần này.',
    });

    expect(status).toBe('PENDING_REVIEW');
    expect((await discover('')).items.map((item) => item.id)).not.toContain(id);
    await http().get(`/v1/listings/${id}`).set(as('finder')).expect(404);
  });

  it('hides a forbidden item and keeps it out of discovery', async () => {
    const { id, status } = await createAndPublish({
      title: `Tặng thuốc cảm ${token}`,
      category: 'HOUSEHOLD',
    });

    expect(status).toBe('MODERATION_HIDDEN');
    expect((await discover('')).items.map((item) => item.id)).not.toContain(id);
  });

  it('lets only the owner change a listing', async () => {
    const { id } = await createAndPublish();

    await http()
      .patch(`/v1/listings/${id}`)
      .set(as('finder'))
      .send({ title: 'Bài này không phải của tôi' })
      .expect(403);
    await http()
      .post(`/v1/listings/${id}/withdraw`)
      .set(as('finder'))
      .expect(403);
    await http()
      .post('/v1/listings')
      .set(as('finder'))
      .send(listing())
      .expect(403);
  });

  it('drops an expired listing from discovery without any job running', async () => {
    const { id } = await createAndPublish();
    await prisma.listing.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });

    expect((await discover('')).items.map((item) => item.id)).not.toContain(id);
    await http().get(`/v1/listings/${id}`).set(as('finder')).expect(404);
  });

  it('pages discovery with a cursor, without repeats', async () => {
    const ids: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      ids.push((await createAndPublish({ areaCode: 'HOC_MON' })).id);
    }

    const first = await discover('area=HOC_MON&limit=2');
    expect(first.items).toHaveLength(2);
    const second = await discover(
      `area=HOC_MON&limit=2&cursor=${encodeURIComponent(first.nextCursor!)}`,
    );

    const seen = [...first.items, ...second.items].map((item) => item.id);
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toEqual(expect.arrayContaining(ids));
  });
});
