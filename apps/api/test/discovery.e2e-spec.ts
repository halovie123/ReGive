import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from '../src/common/http/api-exception.filter';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { DiscoveryModule } from '../src/modules/discovery/discovery.module';
import { IdentityModule } from '../src/modules/identity/identity.module';
import { IdentityVerifier } from '../src/modules/identity/identity-verifier';

/**
 * HTTP wiring only: auth, query validation, response shape. The query
 * itself runs against real Postgres in discovery-db.
 */
describe('Discovery API (e2e)', () => {
  let app: INestApplication<App>;
  const queries: unknown[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              DATABASE_URL:
                'postgresql://unused:unused@127.0.0.1:5432/unused_discovery_test',
              SUPABASE_URL: 'https://unused.supabase.co',
              SUPABASE_JWKS_URL:
                'https://unused.supabase.co/auth/v1/.well-known/jwks.json',
            }),
          ],
        }),
        IdentityModule,
        DiscoveryModule,
      ],
    })
      .overrideProvider(IdentityVerifier)
      .useValue({
        verify: (token: string) =>
          token === 'valid-token'
            ? Promise.resolve({ subject: 'reader', sessionId: 'session-1' })
            : Promise.reject(new Error('invalid token')),
      })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          upsert: () =>
            Promise.resolve({
              id: 'user-1',
              providerSubject: 'reader',
              status: 'ACTIVE',
            }),
        },
        listing: { updateMany: () => Promise.resolve({ count: 0 }) },
        $queryRaw: (...args: unknown[]) => {
          queries.push(args);
          return Promise.resolve([]);
        },
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

  const auth = { Authorization: 'Bearer valid-token' };

  it('keeps the marketplace behind sign-in', async () => {
    await request(app.getHttpServer())
      .get('/v1/discovery/listings')
      .expect(401);
    await request(app.getHttpServer()).get('/v1/discovery/areas').expect(401);
  });

  it('returns an empty page in the published shape', async () => {
    await request(app.getHttpServer())
      .get('/v1/discovery/listings?category=BOOKS&area=HOC_MON&q=sach')
      .set(auth)
      .expect(200)
      .expect({ items: [], nextCursor: null });
  });

  it.each([
    ['an unknown category', 'category=MEDICINE'],
    ['a page size over the cap', 'limit=500'],
    ['a forged cursor', 'cursor=forged'],
  ])('rejects %s before touching the database', async (_label, search) => {
    const before = queries.length;

    await request(app.getHttpServer())
      .get(`/v1/discovery/listings?${search}`)
      .set(auth)
      .expect(422)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'INVALID_INPUT' }),
      );
    expect(queries.length).toBe(before);
  });
});
