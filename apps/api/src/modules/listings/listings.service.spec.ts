import type {
  AppRole,
  AreaCode,
  ItemCategory,
  ItemCondition,
  ListingStatus,
} from '@prisma/client';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { ListingsService } from './listings.service';

type StoredListing = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  defects: string;
  category: ItemCategory;
  condition: ItemCondition;
  areaCode: AreaCode;
  status: ListingStatus;
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const DONOR = 'donor-1';
const OTHER = 'other-1';
const RECIPIENT_ONLY = 'recipient-1';

class MemoryListingsDatabase {
  readonly listings = new Map<string, StoredListing>();
  private readonly roles = new Map<string, Set<AppRole>>([
    [DONOR, new Set(['DONOR'])],
    [OTHER, new Set(['DONOR', 'RECIPIENT'])],
    [RECIPIENT_ONLY, new Set(['RECIPIENT'])],
  ]);
  private readonly areas = new Map<AreaCode, boolean>([
    ['HOC_MON', true],
    ['QUAN_1', true],
    ['CAN_GIO', false],
  ]);
  private sequence = 0;

  readonly $transaction = <T>(work: (client: this) => Promise<T>) => work(this);

  readonly $queryRaw = () => Promise.resolve([]);

  readonly roleAssignment = {
    findUnique: ({
      where: {
        userId_role: { userId, role },
      },
    }: {
      where: { userId_role: { userId: string; role: AppRole } };
    }) => Promise.resolve(this.roles.get(userId)?.has(role) ? { role } : null),
  };

  readonly area = {
    findUnique: ({ where: { code } }: { where: { code: AreaCode } }) =>
      Promise.resolve(
        this.areas.has(code) ? { active: this.areas.get(code)! } : null,
      ),
  };

  readonly listing = {
    create: ({ data }: { data: Omit<StoredListing, Generated> }) => {
      const now = new Date('2026-10-04T08:00:00.000Z');
      const stored: StoredListing = {
        id: `00000000-0000-4000-8000-${String(++this.sequence).padStart(12, '0')}`,
        status: 'DRAFT',
        publishedAt: null,
        expiresAt: null,
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      this.listings.set(stored.id, stored);
      return Promise.resolve({ ...stored });
    },
    findUnique: ({ where: { id } }: { where: { id: string } }) => {
      const stored = this.listings.get(id);
      return Promise.resolve(stored ? { ...stored } : null);
    },
    update: ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: Partial<StoredListing>;
    }) => {
      const stored = { ...this.listings.get(id)!, ...data };
      this.listings.set(id, stored);
      return Promise.resolve({ ...stored });
    },
  };

  seed(overrides: Partial<StoredListing>): StoredListing {
    const id = `00000000-0000-4000-9000-${String(++this.sequence).padStart(12, '0')}`;
    const stored: StoredListing = {
      id,
      ownerId: DONOR,
      title: 'Tủ gỗ hai cánh',
      description: 'Tủ gỗ còn chắc chắn, phù hợp phòng ngủ nhỏ.',
      defects: '',
      category: 'HOUSEHOLD',
      condition: 'GOOD',
      areaCode: 'HOC_MON',
      status: 'DRAFT',
      publishedAt: null,
      expiresAt: null,
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
      updatedAt: new Date('2026-10-01T00:00:00.000Z'),
      ...overrides,
    };
    this.listings.set(id, stored);
    return stored;
  }
}

type Generated =
  'id' | 'status' | 'publishedAt' | 'expiresAt' | 'createdAt' | 'updatedAt';

const newListing = {
  title: 'Bộ sách giáo khoa lớp 5',
  description: 'Đủ 10 cuốn, còn sạch, có bọc bìa. Phù hợp cho năm học mới.',
  defects: 'Hai cuốn bị quăn góc',
  category: 'BOOKS',
  condition: 'GOOD',
  areaCode: 'HOC_MON',
} as const;

describe('ListingsService', () => {
  let database: MemoryListingsDatabase;
  let service: ListingsService;

  beforeEach(() => {
    database = new MemoryListingsDatabase();
    service = new ListingsService(database as unknown as PrismaService);
  });

  describe('create', () => {
    it('saves a donor’s listing as an unpublished draft', async () => {
      const created = await service.create(DONOR, newListing);

      expect(created).toMatchObject({
        ...newListing,
        status: 'DRAFT',
        isOwner: true,
        publishedAt: null,
      });
      expect(database.listings.get(created.id)?.ownerId).toBe(DONOR);
    });

    it('requires the donor role', async () => {
      await expect(
        service.create(RECIPIENT_ONLY, newListing),
      ).rejects.toMatchObject({
        status: 403,
        publicProblem: { code: 'DONOR_ROLE_REQUIRED' },
      });
      expect(database.listings.size).toBe(0);
    });

    it('refuses an area that has been switched off', async () => {
      await expect(
        service.create(DONOR, { ...newListing, areaCode: 'CAN_GIO' }),
      ).rejects.toMatchObject({ publicProblem: { code: 'AREA_UNAVAILABLE' } });
    });
  });

  describe('update', () => {
    it('lets the owner edit a draft', async () => {
      const draft = database.seed({});

      const updated = await service.update(DONOR, draft.id, {
        condition: 'FAIR',
      });

      expect(updated).toMatchObject({ condition: 'FAIR', status: 'DRAFT' });
    });

    it('forbids anyone but the owner', async () => {
      const draft = database.seed({});

      await expect(
        service.update(OTHER, draft.id, { title: 'Đã bị chiếm quyền' }),
      ).rejects.toMatchObject({
        status: 403,
        publicProblem: { code: 'LISTING_FORBIDDEN' },
      });
      expect(database.listings.get(draft.id)?.title).toBe(draft.title);
    });

    it('reports a missing listing as not found', async () => {
      await expect(
        service.update(DONOR, '00000000-0000-4000-8000-999999999999', {
          title: 'Không tồn tại',
        }),
      ).rejects.toMatchObject({
        status: 404,
        publicProblem: { code: 'LISTING_NOT_FOUND' },
      });
    });

    it('refuses to edit a completed listing', async () => {
      const completed = database.seed({ status: 'COMPLETED' });

      await expect(
        service.update(DONOR, completed.id, { title: 'Sửa sau khi trao' }),
      ).rejects.toMatchObject({
        status: 409,
        publicProblem: { code: 'LISTING_STATE_INVALID' },
      });
    });

    it('takes an edited live listing off the public feed until it is reviewed', async () => {
      const live = database.seed({
        status: 'PUBLISHED',
        publishedAt: new Date('2026-10-02T00:00:00Z'),
        expiresAt: new Date('2026-11-01T00:00:00Z'),
      });

      const updated = await service.update(DONOR, live.id, {
        description: 'Mô tả mới hoàn toàn khác với bản đã duyệt trước đó.',
      });

      expect(updated.status).toBe('PENDING_REVIEW');
    });

    it('refuses to move a listing into a switched-off area', async () => {
      const draft = database.seed({});

      await expect(
        service.update(DONOR, draft.id, { areaCode: 'CAN_GIO' }),
      ).rejects.toMatchObject({ publicProblem: { code: 'AREA_UNAVAILABLE' } });
    });
  });

  describe('submit and withdraw', () => {
    it('sends a submitted draft to review rather than straight to the public', async () => {
      const draft = database.seed({});

      await expect(service.submit(DONOR, draft.id)).resolves.toMatchObject({
        status: 'PENDING_REVIEW',
        publishedAt: null,
      });
    });

    it('withdraws a listing for its owner only', async () => {
      const draft = database.seed({});

      await expect(service.withdraw(OTHER, draft.id)).rejects.toMatchObject({
        publicProblem: { code: 'LISTING_FORBIDDEN' },
      });
      await expect(service.withdraw(DONOR, draft.id)).resolves.toMatchObject({
        status: 'WITHDRAWN',
      });
    });
  });

  describe('get', () => {
    it('shows the owner their own draft', async () => {
      const draft = database.seed({});

      await expect(service.get(DONOR, draft.id)).resolves.toMatchObject({
        id: draft.id,
        isOwner: true,
      });
    });

    /**
     * Someone else's draft, pending or hidden listing answers exactly like a
     * listing that does not exist, so its existence is not revealed.
     */
    it.each<ListingStatus>([
      'DRAFT',
      'PENDING_REVIEW',
      'WITHDRAWN',
      'MODERATION_HIDDEN',
    ])('hides another member’s %s listing as not found', async (status) => {
      const listing = database.seed({ status });

      await expect(service.get(OTHER, listing.id)).rejects.toMatchObject({
        status: 404,
        publicProblem: { code: 'LISTING_NOT_FOUND' },
      });
    });

    it('shows a live listing to other members without marking them owner', async () => {
      const live = database.seed({
        status: 'PUBLISHED',
        publishedAt: new Date('2026-10-02T00:00:00Z'),
        expiresAt: new Date('2099-01-01T00:00:00Z'),
      });

      await expect(service.get(OTHER, live.id)).resolves.toMatchObject({
        id: live.id,
        isOwner: false,
        publishedAt: '2026-10-02T00:00:00.000Z',
      });
    });

    it('hides a published listing whose expiry has passed', async () => {
      const stale = database.seed({
        status: 'PUBLISHED',
        publishedAt: new Date('2026-08-01T00:00:00Z'),
        expiresAt: new Date('2026-08-31T00:00:00Z'),
      });

      await expect(service.get(OTHER, stale.id)).rejects.toMatchObject({
        publicProblem: { code: 'LISTING_NOT_FOUND' },
      });
    });
  });
});
