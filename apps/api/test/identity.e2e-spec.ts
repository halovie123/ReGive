import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { UserStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from '../src/common/http/api-exception.filter';
import { IdentityModule } from '../src/modules/identity/identity.module';
import { IdentityVerifier } from '../src/modules/identity/identity-verifier';
import { IDENTITY_USER_STORE } from '../src/modules/identity/identity-user.store';
import { JwtAuthGuard } from '../src/modules/identity/jwt-auth.guard';

type MemoryUser = {
  id: string;
  providerSubject: string;
  status: UserStatus;
};

class MemoryIdentityStore {
  readonly users = new Map<string, MemoryUser>();
  readonly user = {
    upsert: ({ where }: { where: { providerSubject: string } }) => {
      const existing = this.users.get(where.providerSubject);
      if (existing) return Promise.resolve(existing);
      const created: MemoryUser = {
        id: `user-${this.users.size + 1}`,
        providerSubject: where.providerSubject,
        status: 'ACTIVE',
      };
      this.users.set(where.providerSubject, created);
      return Promise.resolve(created);
    },
  };
}

/**
 * Stands in for any community route added by a later plan. It is guarded the
 * way those routes must be guarded: JwtAuthGuard and nothing else.
 */
@Controller('community-probe')
class CommunityProbeController {
  @Get()
  @UseGuards(JwtAuthGuard)
  probe(): { allowed: true } {
    return { allowed: true };
  }
}

describe('Identity flow (e2e)', () => {
  let app: INestApplication<App>;
  let store: MemoryIdentityStore;

  beforeAll(async () => {
    store = new MemoryIdentityStore();
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              DATABASE_URL:
                'postgresql://unused:unused@127.0.0.1:5432/unused_identity_test',
              SUPABASE_URL: 'https://unused.supabase.co',
              SUPABASE_JWKS_URL:
                'https://unused.supabase.co/auth/v1/.well-known/jwks.json',
            }),
          ],
        }),
        IdentityModule,
      ],
      controllers: [CommunityProbeController],
    })
      .overrideProvider(IDENTITY_USER_STORE)
      .useValue(store)
      .overrideProvider(IdentityVerifier)
      .useValue({
        verify: (token: string) => {
          if (token !== 'valid-token') {
            return Promise.reject(new Error('invalid test token'));
          }
          return Promise.resolve({
            subject: 'subject-1',
            sessionId: 'session-1',
          });
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

  /**
   * Phone sign-in was removed (no paid SMS gateway) and VerifiedPhoneGuard
   * deleted with it. This is the guard against it coming back by accident:
   * an OAuth user has no phone and never will, so a community route must
   * admit them on a valid JWT alone. Reintroducing any phone gate turns this
   * red — where a unit test would not, because unit tests supply their own
   * `phoneVerified: true` fixtures and never notice that no real account can
   * satisfy the check.
   */
  it('admits a phone-less OAuth user to community routes on a valid JWT alone', async () => {
    const authorization = { Authorization: 'Bearer valid-token' };

    await request(app.getHttpServer())
      .get('/v1/community-probe')
      .set(authorization)
      .set('x-correlation-id', 'identity-community-access')
      .expect(200, { allowed: true });
  });

  it('rejects a request with no bearer token', async () => {
    const denied = await request(app.getHttpServer())
      .get('/v1/community-probe')
      .expect(401);
    expect(denied.body).toMatchObject({ code: 'AUTH_REQUIRED' });
  });

  it('provisions one user per subject no matter how often it is presented', async () => {
    const authorization = { Authorization: 'Bearer valid-token' };

    await request(app.getHttpServer())
      .get('/v1/community-probe')
      .set(authorization)
      .expect(200);
    await request(app.getHttpServer())
      .get('/v1/community-probe')
      .set(authorization)
      .expect(200);

    expect([...store.users.keys()]).toEqual(['subject-1']);
  });

  /**
   * The removed sync-phone endpoint was the only reason the API held a
   * Supabase service-role key. Nothing may re-register a route under
   * /v1/identity without that being a deliberate decision.
   */
  it('exposes no identity endpoints at all', async () => {
    await request(app.getHttpServer())
      .post('/v1/identity/sync-phone')
      .set({ Authorization: 'Bearer valid-token' })
      .expect(404);
  });
});
