import type { AreaCode, AppRole } from '@prisma/client';
import { ProfilesService } from './profiles.service';

type StoredUser = {
  id: string;
  phoneLast4: string | null;
  phoneVerifiedAt: Date | null;
  activeRole: AppRole | null;
  profile: {
    displayName: string;
    bio: string;
    avatarKey: string | null;
  } | null;
  roles: Set<AppRole>;
  areas: Set<AreaCode>;
};

class MemoryProfilesDatabase {
  readonly users = new Map<string, StoredUser>();
  failNextUserRead = false;
  readonly areas = new Map<AreaCode, boolean>([
    ['HOC_MON', true],
    ['QUAN_1', false],
    ['QUAN_3', true],
    ['QUAN_7', true],
  ]);

  constructor() {
    this.users.set('user-1', {
      id: 'user-1',
      phoneLast4: '5678',
      phoneVerifiedAt: new Date('2026-08-04T10:00:00.000Z'),
      activeRole: 'DONOR',
      profile: null,
      roles: new Set(['DONOR']),
      areas: new Set(['HOC_MON']),
    });
  }

  readonly user = {
    findUniqueOrThrow: ({ where: { id } }: { where: { id: string } }) => {
      if (this.failNextUserRead) {
        this.failNextUserRead = false;
        return Promise.reject(new Error('Injected response read failure'));
      }
      return Promise.resolve(this.serialize(this.userFor(id)));
    },
    update: ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: { activeRole: AppRole | null };
    }) => {
      this.userFor(id).activeRole = data.activeRole;
      return Promise.resolve(this.serialize(this.userFor(id)));
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

  readonly area = {
    findMany: ({
      where: { code, active },
    }: {
      where: { code: { in: AreaCode[] }; active: boolean };
    }) =>
      Promise.resolve(
        code.in
          .filter((areaCode) => this.areas.get(areaCode) === active)
          .map((code) => ({ code })),
      ),
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
        this.areas.get(areaCode) === true ? [{ code: areaCode }] : [],
      );
    }
    return Promise.resolve([{ id: values[0] }]);
  };

  $transaction = async <T>(
    operation: (transaction: this) => Promise<T>,
  ): Promise<T> => {
    const snapshot = new Map(
      [...this.users].map(([id, user]) => [
        id,
        {
          ...user,
          profile: user.profile ? { ...user.profile } : null,
          roles: new Set(user.roles),
          areas: new Set(user.areas),
        },
      ]),
    );
    try {
      return await operation(this);
    } catch (error) {
      this.users.clear();
      snapshot.forEach((user, id) => this.users.set(id, user));
      throw error;
    }
  };

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

describe('ProfilesService', () => {
  let database: MemoryProfilesDatabase;
  let service: ProfilesService;

  beforeEach(() => {
    database = new MemoryProfilesDatabase();
    service = new ProfilesService(database as never);
  });

  it('returns a safe incomplete current-user response', async () => {
    await expect(service.getMe('user-1')).resolves.toEqual({
      id: 'user-1',
      phoneVerified: true,
      phoneLast4: '5678',
      profile: null,
      roles: ['DONOR'],
      activeRole: 'DONOR',
      areas: ['HOC_MON'],
    });
  });

  it('upserts a profile and returns the complete current-user response', async () => {
    await expect(
      service.updateProfile('user-1', { displayName: 'Linh', bio: 'Chia sẻ' }),
    ).resolves.toMatchObject({
      profile: {
        displayName: 'Linh',
        bio: 'Chia sẻ',
        avatarKey: null,
      },
      phoneLast4: '5678',
      roles: ['DONOR'],
      areas: ['HOC_MON'],
    });
  });

  it('replaces roles without duplicate assignments and clears an inactive active role', async () => {
    await expect(
      service.updateRoles('user-1', ['RECIPIENT', 'RECIPIENT', 'VOLUNTEER']),
    ).resolves.toMatchObject({
      roles: ['RECIPIENT', 'VOLUNTEER'],
      activeRole: null,
      areas: ['HOC_MON'],
    });
  });

  it('rejects selecting an active role that the user does not hold', async () => {
    await expect(
      service.updateActiveRole('user-1', 'VOLUNTEER'),
    ).rejects.toMatchObject({
      status: 422,
      response: { code: 'ROLE_NOT_ASSIGNED' },
    });
  });

  it('rolls back an active-role change when completing its response fails', async () => {
    database.users.get('user-1')!.roles.add('VOLUNTEER');
    database.failNextUserRead = true;

    await expect(
      service.updateActiveRole('user-1', 'VOLUNTEER'),
    ).rejects.toThrow('Injected response read failure');

    await expect(service.getMe('user-1')).resolves.toMatchObject({
      activeRole: 'DONOR',
      roles: ['DONOR', 'VOLUNTEER'],
    });
  });

  it('rejects inactive and unknown areas without replacing existing areas', async () => {
    await expect(
      service.updateAreas('user-1', ['QUAN_1']),
    ).rejects.toMatchObject({
      status: 422,
      response: { code: 'AREA_UNAVAILABLE' },
    });
    await expect(
      service.updateAreas('user-1', ['UNKNOWN'] as unknown as AreaCode[]),
    ).rejects.toMatchObject({
      status: 422,
      response: { code: 'AREA_UNAVAILABLE' },
    });
    await expect(service.getMe('user-1')).resolves.toMatchObject({
      areas: ['HOC_MON'],
    });
  });

  it('replaces areas without duplicate assignments and returns the complete response', async () => {
    await expect(
      service.updateAreas('user-1', ['QUAN_7', 'QUAN_7', 'QUAN_3']),
    ).resolves.toMatchObject({
      profile: null,
      roles: ['DONOR'],
      areas: ['QUAN_3', 'QUAN_7'],
    });
  });
});
