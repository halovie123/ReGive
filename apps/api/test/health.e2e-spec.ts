import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from './../src/common/http/api-exception.filter';
import { PrismaService } from './../src/common/prisma/prisma.service';
import { AppModule } from './../src/app.module';

/**
 * Stands in for the real client so these run without a database. The
 * database-backed probe is covered by the unit spec; what matters here is
 * the wiring — routes, prefix, status codes and the error envelope.
 */
const stubPrisma = (behaviour: () => Promise<unknown>) => ({
  $queryRaw: behaviour,
});

const buildApp = async (
  behaviour: () => Promise<unknown>,
): Promise<INestApplication<App>> => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(stubPrisma(behaviour))
    .compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new ApiExceptionFilter({ error: () => undefined }));
  await app.init();
  return app;
};

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    await app?.close();
  });

  it('GET /v1/health', async () => {
    app = await buildApp(() => Promise.resolve([{}]));

    await request(app.getHttpServer())
      .get('/v1/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /v1/ready reports ready while the database answers', async () => {
    app = await buildApp(() => Promise.resolve([{}]));

    await request(app.getHttpServer())
      .get('/v1/ready')
      .expect(200)
      .expect({ status: 'ready' });
  });

  it('GET /v1/ready returns 503 when the database is unreachable', async () => {
    app = await buildApp(() => Promise.reject(new Error('connection refused')));

    const response = await request(app.getHttpServer())
      .get('/v1/ready')
      .expect(503);
    expect(response.body).toMatchObject({ code: 'NOT_READY' });
  });

  /**
   * Liveness must stay independent of the database: a dead database is a
   * reason to stop routing traffic, not a reason to kill the process.
   */
  it('GET /v1/health still answers while the database is unreachable', async () => {
    app = await buildApp(() => Promise.reject(new Error('connection refused')));

    await request(app.getHttpServer())
      .get('/v1/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  /**
   * The Nest scaffold's AppController served "Hello World!" at the API root
   * and reached production that way. The API is not a website: every route
   * it owns is deliberate, so an unclaimed path must 404 rather than answer
   * with something a reader could mistake for a working endpoint.
   */
  it('serves nothing at the API root', async () => {
    app = await buildApp(() => Promise.resolve([{}]));

    await request(app.getHttpServer()).get('/v1').expect(404);
  });
});
