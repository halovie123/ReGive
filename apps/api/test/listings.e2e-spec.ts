import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { AppRole, ListingStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from '../src/common/http/api-exception.filter';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { IdentityModule } from '../src/modules/identity/identity.module';
import { IdentityVerifier } from '../src/modules/identity/identity-verifier';
import { ListingsModule } from '../src/modules/listings/listings.module';

type Row = Record<string, unknown> & {
  id: string;
  ownerId: string;
  status: ListingStatus;
};

/**
 * Just enough of Prisma for the HTTP wiring. Row locking, foreign keys and
 * enum columns are exercised against real Postgres in listings-db.
 */
class MemoryDatabase {
  private readonly subjects = new Map<string, string>();
  private readonly roles = new Map<string, AppRole[]>([
    ['user-1', ['DONOR']],
    ['user-2', ['DONOR']],
  ]);
  private readonly listings = new Map<string, Row>();

  readonly $transaction = <T>(work: (client: this) => Promise<T>) => work(this);
  readonly $queryRaw = () => Promise.resolve([]);

  readonly user = {
    upsert: ({
      where: { providerSubject },
    }: {
      where: { providerSubject: string };
    }) => {
      if (!this.subjects.has(providerSubject)) {
        this.subjects.set(providerSubject, `user-${this.subjects.size + 1}`);
      }
      return Promise.resolve({
        id: this.subjects.get(providerSubject)!,
        providerSubject,
        status: 'ACTIVE' as const,
      });
    },
  };

  readonly roleAssignment = {
    findUnique: ({
      where: {
        userId_role: { userId, role },
      },
    }: {
      where: { userId_role: { userId: string; role: AppRole } };
    }) =>
      Promise.resolve(this.roles.get(userId)?.includes(role) ? { role } : null),
  };

  readonly listingRiskAssessment = {
    create: ({ data }: { data: unknown }) => Promise.resolve(data),
  };

  readonly area = {
    findUnique: () => Promise.resolve({ active: true }),
  };

  readonly listing = {
    create: ({ data }: { data: Record<string, unknown> }) => {
      const now = new Date('2026-10-04T08:00:00.000Z');
      const row = {
        id: `00000000-0000-4000-8000-${String(this.listings.size + 1).padStart(12, '0')}`,
        status: 'DRAFT' as const,
        publishedAt: null,
        expiresAt: null,
        createdAt: now,
        updatedAt: now,
        ...data,
      } as unknown as Row;
      this.listings.set(row.id, row);
      return Promise.resolve({ ...row });
    },
    findMany: ({ where: { ownerId } }: { where: { ownerId: string } }) =>
      Promise.resolve(
        [...this.listings.values()].filter((row) => row.ownerId === ownerId),
      ),
    findUnique: ({ where: { id } }: { where: { id: string } }) =>
      Promise.resolve(
        this.listings.has(id) ? { ...this.listings.get(id)! } : null,
      ),
    update: ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = { ...this.listings.get(id)!, ...data } as Row;
      this.listings.set(id, row);
      return Promise.resolve({ ...row });
    },
  };
}

const owner = { Authorization: 'Bearer owner-token' };
const stranger = { Authorization: 'Bearer stranger-token' };

const listing = {
  title: 'Xe đạp trẻ em 16 inch',
  description: 'Xe còn chạy tốt, phù hợp bé 4 đến 6 tuổi, có bánh phụ.',
  defects: 'Yên hơi bạc màu',
  category: 'CHILDREN',
  condition: 'GOOD',
  areaCode: 'GO_VAP',
};

describe('Listings API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              DATABASE_URL:
                'postgresql://unused:unused@127.0.0.1:5432/unused_listings_test',
              SUPABASE_URL: 'https://unused.supabase.co',
              SUPABASE_JWKS_URL:
                'https://unused.supabase.co/auth/v1/.well-known/jwks.json',
            }),
          ],
        }),
        IdentityModule,
        ListingsModule,
      ],
    })
      .overrideProvider(IdentityVerifier)
      .useValue({
        verify: (token: string) => {
          const subject = {
            'owner-token': 'owner-subject',
            'stranger-token': 'stranger-subject',
          }[token];
          return subject
            ? Promise.resolve({ subject, sessionId: 'session-1' })
            : Promise.reject(new Error('invalid token'));
        },
      })
      .overrideProvider(PrismaService)
      .useValue(new MemoryDatabase())
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalFilters(new ApiExceptionFilter({ error: () => undefined }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('requires sign-in for every listing endpoint', async () => {
    await request(app.getHttpServer())
      .post('/v1/listings')
      .send(listing)
      .expect(401)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'AUTH_REQUIRED' }),
      );
  });

  it('rejects an invalid listing without leaking validator internals', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/listings')
      .set(owner)
      .send({ ...listing, category: 'MEDICINE' })
      .expect(422);

    expect(response.body).toMatchObject({ code: 'INVALID_INPUT' });
    expect(JSON.stringify(response.body)).not.toContain('MEDICINE');
  });

  it('answers a malformed id with 404, not a database error', async () => {
    await request(app.getHttpServer())
      .get('/v1/listings/not-a-uuid')
      .set(owner)
      .expect(404)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'LISTING_NOT_FOUND' }),
      );
  });

  it('runs the owner flow: draft, edit, publish, withdraw', async () => {
    const created = await request(app.getHttpServer())
      .post('/v1/listings')
      .set(owner)
      .send({ ...listing, address: '45 Quang Trung, Gò Vấp' })
      .expect(201);
    expect(created.body).toMatchObject({ status: 'DRAFT', isOwner: true });
    expect(created.body).not.toHaveProperty('address');
    expect(created.body).not.toHaveProperty('ownerId');
    const path = `/v1/listings/${(created.body as { id: string }).id}`;

    await request(app.getHttpServer())
      .patch(path)
      .set(owner)
      .send({ condition: 'FAIR' })
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ condition: 'FAIR' }));

    await request(app.getHttpServer())
      .post(`${path}/publish`)
      .set(owner)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ status: 'PUBLISHED' }),
      );

    await request(app.getHttpServer())
      .post(`${path}/withdraw`)
      .set(owner)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ status: 'WITHDRAWN' }),
      );

    await request(app.getHttpServer())
      .post(`${path}/publish`)
      .set(owner)
      .expect(409)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'LISTING_STATE_INVALID' }),
      );
  });

  it('keeps other members out of someone else’s listing', async () => {
    const created = await request(app.getHttpServer())
      .post('/v1/listings')
      .set(owner)
      .send(listing)
      .expect(201);
    const path = `/v1/listings/${(created.body as { id: string }).id}`;

    await request(app.getHttpServer())
      .patch(path)
      .set(stranger)
      .send({ title: 'Chiếm quyền bài đăng' })
      .expect(403)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'LISTING_FORBIDDEN' }),
      );
    await request(app.getHttpServer()).get(path).set(stranger).expect(404);
  });

  it('lets other members see a published listing, without owner rights', async () => {
    const created = await request(app.getHttpServer())
      .post('/v1/listings')
      .set(owner)
      .send(listing)
      .expect(201);
    const path = `/v1/listings/${(created.body as { id: string }).id}`;
    await request(app.getHttpServer())
      .post(`${path}/publish`)
      .set(owner)
      .expect(200);

    await request(app.getHttpServer())
      .get(path)
      .set(stranger)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ status: 'PUBLISHED', isOwner: false }),
      );
  });

  it.each([
    [
      'holds a listing with a phone number for review',
      { description: 'Xe còn chạy tốt, ai cần gọi 0909123456 để nhận nhé.' },
      200,
      { status: 'PENDING_REVIEW' },
    ],
    [
      'hides a forbidden item',
      {
        title: 'Tặng thuốc cảm',
        description: 'Còn hạn dùng, ai cần thì nhắn mình.',
      },
      200,
      { status: 'MODERATION_HIDDEN' },
    ],
    [
      'refuses to publish without stated defects',
      { defects: '' },
      422,
      { code: 'LISTING_INCOMPLETE' },
    ],
  ])('%s', async (_label, override, expectedStatus, expectedBody) => {
    const created = await request(app.getHttpServer())
      .post('/v1/listings')
      .set(owner)
      .send({ ...listing, ...override })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/v1/listings/${(created.body as { id: string }).id}/publish`)
      .set(owner)
      .expect(expectedStatus)
      .expect(({ body }) => expect(body).toMatchObject(expectedBody));
  });

  it('serves the owner’s own list at /mine rather than treating it as an id', async () => {
    await request(app.getHttpServer())
      .post('/v1/listings')
      .set(stranger)
      .send(listing)
      .expect(201);

    const mine = await request(app.getHttpServer())
      .get('/v1/listings/mine')
      .set(stranger)
      .expect(200);

    const body = mine.body as { isOwner: boolean }[];
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((item) => item.isOwner)).toBe(true);
  });
});
