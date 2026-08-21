import { ExecutionContext } from '@nestjs/common';
import type { UserStatus } from '@prisma/client';
import type { IdentityClaims } from '@buy-nothing/contracts';
import { IdentityVerifier } from './identity-verifier';
import { JwtAuthGuard } from './jwt-auth.guard';

type StoredUser = {
  id: string;
  providerSubject: string;
  phoneVerifiedAt: Date | null;
  status: UserStatus;
};

class FixedIdentityVerifier implements IdentityVerifier {
  verify(token: string): Promise<IdentityClaims> {
    if (token !== 'valid-token') {
      return Promise.reject(new Error('untrusted token detail'));
    }
    return Promise.resolve({ subject: 'subject-1', sessionId: 'session-1' });
  }
}

class MemoryPrisma {
  constructor(private readonly provisionedStatus: UserStatus = 'ACTIVE') {}

  readonly users = new Map<string, StoredUser>();
  readonly user = {
    upsert: ({
      where,
    }: {
      where: { providerSubject: string };
      create: { providerSubject: string };
      update: Record<string, never>;
    }): Promise<StoredUser> => {
      const existing = this.users.get(where.providerSubject);
      if (existing) return Promise.resolve(existing);
      const created = {
        id: `user-${this.users.size + 1}`,
        providerSubject: where.providerSubject,
        phoneVerifiedAt: null,
        status: this.provisionedStatus,
      };
      this.users.set(where.providerSubject, created);
      return Promise.resolve(created);
    },
  };
}

const requestContext = (authorization?: string | string[]) => {
  const request = { headers: { authorization } };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
  return { context, request };
};

describe('JwtAuthGuard', () => {
  it('provisions exactly one local user for repeated verified subjects', async () => {
    const prisma = new MemoryPrisma();
    const guard = new JwtAuthGuard(
      new FixedIdentityVerifier(),
      prisma as never,
    );

    await guard.canActivate(requestContext('Bearer valid-token').context);
    await guard.canActivate(requestContext('Bearer valid-token').context);

    expect([...prisma.users.values()]).toEqual([
      {
        id: 'user-1',
        providerSubject: 'subject-1',
        phoneVerifiedAt: null,
        status: 'ACTIVE',
      },
    ]);
  });

  it.each([
    undefined,
    'Basic valid-token',
    'Bearer first-token, Bearer second-token',
    ['Bearer first-token', 'Bearer second-token'],
  ])(
    'rejects missing or non-unique Bearer credentials',
    async (authorization) => {
      const guard = new JwtAuthGuard(
        new FixedIdentityVerifier(),
        new MemoryPrisma() as never,
      );

      await expect(
        guard.canActivate(requestContext(authorization).context),
      ).rejects.toMatchObject({
        status: 401,
        response: { code: 'AUTH_REQUIRED' },
      });
    },
  );

  it('maps verifier failures to a safe AUTH_REQUIRED response', async () => {
    const guard = new JwtAuthGuard(
      new FixedIdentityVerifier(),
      new MemoryPrisma() as never,
    );

    await expect(
      guard.canActivate(requestContext('Bearer invalid-token').context),
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'AUTH_REQUIRED' },
    });
  });

  it('derives phone verification only from the local user record', async () => {
    const verifier: IdentityVerifier = {
      verify: () =>
        Promise.resolve({
          subject: 'subject-1',
          sessionId: 'session-1',
          phone_verified: true,
        } as IdentityClaims),
    };
    const { context, request } = requestContext('Bearer valid-token');
    const guard = new JwtAuthGuard(verifier, new MemoryPrisma() as never);

    await guard.canActivate(context);

    expect(request).toMatchObject({
      currentUser: {
        id: 'user-1',
        providerSubject: 'subject-1',
        phoneVerified: false,
      },
    });
  });

  it('admits an ACTIVE account', async () => {
    const { context, request } = requestContext('Bearer valid-token');
    const guard = new JwtAuthGuard(
      new FixedIdentityVerifier(),
      new MemoryPrisma('ACTIVE') as never,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toMatchObject({ currentUser: { id: 'user-1' } });
  });

  it.each(['SUSPENDED', 'DEACTIVATED'] as const)(
    'refuses a %s account even with a valid token',
    async (status) => {
      const { context, request } = requestContext('Bearer valid-token');
      const guard = new JwtAuthGuard(
        new FixedIdentityVerifier(),
        new MemoryPrisma(status) as never,
      );

      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: 403,
        response: {
          code: 'ACCOUNT_SUSPENDED',
          message:
            'Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ bộ phận hỗ trợ.',
        },
      });
      // A refused request must never be handed a currentUser downstream.
      expect(request).not.toHaveProperty('currentUser');
    },
  );
});
