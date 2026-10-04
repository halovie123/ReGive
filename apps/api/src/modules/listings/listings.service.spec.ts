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
  searchText?: string;
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
    findMany: ({
      where: { ownerId },
      take,
    }: {
      where: { ownerId: string };
      orderBy: { updatedAt: 'desc' };
      take: number;
    }) =>
      Promise.resolve(
        [...this.listings.values()]
          .filter((stored) => stored.ownerId === ownerId)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, take)
          .map((stored) => ({ ...stored })),
      ),
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
    updateMany: ({
      where,
      data,
    }: {
      where: { status: ListingStatus; expiresAt: { lte: Date } };
      data: Partial<StoredListing>;
    }) => {
      let count = 0;
      for (const [id, stored] of this.listings) {
        if (
          stored.status === where.status &&
          stored.expiresAt !== null &&
          stored.expiresAt <= where.expiresAt.lte
        ) {
          this.listings.set(id, { ...stored, ...data });
          count += 1;
        }
      }
      return Promise.resolve({ count });
    },
  };

  readonly assessments: {
    listingId: string;
    level: string;
    reasons: string[];
  }[] = [];

  readonly listingRiskAssessment = {
    create: ({
      data,
    }: {
      data: { listingId: string; level: string; reasons: string[] };
    }) => {
      this.assessments.push(data);
      return Promise.resolve(data);
    },
  };

  seed(overrides: Partial<StoredListing>): StoredListing {
    const id = `00000000-0000-4000-9000-${String(++this.sequence).padStart(12, '0')}`;
    const stored: StoredListing = {
      id,
      ownerId: DONOR,
      title: 'Tủ gỗ hai cánh',
      description: 'Tủ gỗ còn chắc chắn, phù hợp phòng ngủ nhỏ.',
      defects: 'Trầy nhẹ ở góc',
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

  /**
   * Discovery searches search_text, so it must follow every change to the
   * title or description, accent-free so "sach" finds "sách".
   */
  describe('search text', () => {
    it('stores an accent-free copy of the title and description', async () => {
      const created = await service.create(DONOR, newListing);

      expect(database.listings.get(created.id)?.searchText).toBe(
        'bo sach giao khoa lop 5 du 10 cuon con sach co boc bia phu hop cho nam hoc moi',
      );
    });

    it('recomputes it when the title changes', async () => {
      const created = await service.create(DONOR, newListing);

      await service.update(DONOR, created.id, {
        title: 'Truyện tranh Đôrêmon',
      });

      expect(database.listings.get(created.id)?.searchText).toMatch(
        /^truyen tranh doremon du 10 cuon/,
      );
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

    it('refuses to move a listing into a switched-off area', async () => {
      const draft = database.seed({});

      await expect(
        service.update(DONOR, draft.id, { areaCode: 'CAN_GIO' }),
      ).rejects.toMatchObject({ publicProblem: { code: 'AREA_UNAVAILABLE' } });
    });
  });

  describe('submit and withdraw', () => {
    const DAY = 24 * 60 * 60 * 1000;

    it('publishes a safe listing for 30 days and records the screening', async () => {
      const draft = database.seed({});

      const published = await service.submit(DONOR, draft.id);

      expect(published.status).toBe('PUBLISHED');
      expect(
        Date.parse(published.expiresAt!) - Date.parse(published.publishedAt!),
      ).toBe(30 * DAY);
      expect(database.assessments).toEqual([
        { listingId: draft.id, level: 'LOW', reasons: [] },
      ]);
    });

    it('holds a listing with a phone number for a moderator', async () => {
      const draft = database.seed({
        description: 'Tủ gỗ còn chắc chắn. Liên hệ 0909123456 để nhận.',
      });

      await expect(service.submit(DONOR, draft.id)).resolves.toMatchObject({
        status: 'PENDING_REVIEW',
        publishedAt: null,
      });
      expect(database.assessments[0]).toMatchObject({
        level: 'MEDIUM',
        reasons: ['CONTACT_PHONE'],
      });
    });

    it('hides a forbidden item instead of publishing it', async () => {
      const draft = database.seed({
        title: 'Tặng thuốc cảm',
        description: 'Còn hạn dùng tới cuối năm sau, ai cần thì nhắn.',
      });

      await expect(service.submit(DONOR, draft.id)).resolves.toMatchObject({
        status: 'MODERATION_HIDDEN',
        publishedAt: null,
      });
    });

    /**
     * The spec asks donors to state an item's defects. An empty field is
     * allowed while drafting but not at submission; "Không có" is a valid
     * answer for a new item.
     */
    it('refuses to submit a listing whose defects were left empty', async () => {
      const draft = database.seed({ defects: '  ' });

      await expect(service.submit(DONOR, draft.id)).rejects.toMatchObject({
        status: 422,
        publicProblem: { code: 'LISTING_INCOMPLETE' },
      });
      expect(database.listings.get(draft.id)?.status).toBe('DRAFT');
      expect(database.assessments).toEqual([]);
    });

    /**
     * Editing must not bump a listing back to the top of the feed or extend
     * its life; only the first publication sets the dates.
     */
    it('keeps the original dates when a safe edit republishes a live listing', async () => {
      const live = database.seed({
        status: 'PUBLISHED',
        publishedAt: new Date('2026-10-02T00:00:00.000Z'),
        expiresAt: new Date('2099-11-01T00:00:00.000Z'),
      });

      const edited = await service.update(DONOR, live.id, {
        condition: 'FAIR',
      });

      expect(edited).toMatchObject({
        status: 'PUBLISHED',
        publishedAt: '2026-10-02T00:00:00.000Z',
        expiresAt: '2099-11-01T00:00:00.000Z',
      });
    });

    it('screens the edited text, not the text it replaced', async () => {
      const live = database.seed({
        status: 'PUBLISHED',
        publishedAt: new Date('2026-10-02T00:00:00.000Z'),
        expiresAt: new Date('2099-11-01T00:00:00.000Z'),
      });

      await expect(
        service.update(DONOR, live.id, {
          description: 'Tủ gỗ còn tốt, ai cần gọi 0909123456 nhé mọi người.',
        }),
      ).resolves.toMatchObject({ status: 'PENDING_REVIEW' });
    });

    it('publishes a held listing once the owner removes what held it', async () => {
      const held = database.seed({
        status: 'PENDING_REVIEW',
        description: 'Tủ gỗ còn chắc chắn. Liên hệ 0909123456 để nhận.',
        defects: 'Trầy nhẹ ở góc',
      });

      await expect(
        service.update(DONOR, held.id, {
          description:
            'Tủ gỗ còn chắc chắn, phù hợp phòng ngủ nhỏ, nhắn tin trong app.',
        }),
      ).resolves.toMatchObject({ status: 'PUBLISHED' });
    });

    it('treats a published listing past its expiry as expired', async () => {
      const stale = database.seed({
        status: 'PUBLISHED',
        publishedAt: new Date('2026-08-01T00:00:00.000Z'),
        expiresAt: new Date('2026-08-31T00:00:00.000Z'),
      });

      await expect(service.get(DONOR, stale.id)).resolves.toMatchObject({
        status: 'EXPIRED',
      });
      await expect(
        service.update(DONOR, stale.id, { condition: 'FAIR' }),
      ).rejects.toMatchObject({
        publicProblem: { code: 'LISTING_STATE_INVALID' },
      });
    });

    it('marks due listings EXPIRED, and only those, however often it runs', async () => {
      const due = database.seed({
        status: 'PUBLISHED',
        publishedAt: new Date('2026-08-01T00:00:00.000Z'),
        expiresAt: new Date('2026-08-31T00:00:00.000Z'),
      });
      const live = database.seed({
        status: 'PUBLISHED',
        publishedAt: new Date('2026-10-01T00:00:00.000Z'),
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      });
      const now = new Date('2026-10-04T08:00:00.000Z');

      await expect(service.sweepExpired(now)).resolves.toBe(1);
      await expect(service.sweepExpired(now)).resolves.toBe(0);
      expect(database.listings.get(due.id)?.status).toBe('EXPIRED');
      expect(database.listings.get(live.id)?.status).toBe('PUBLISHED');
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

  /**
   * The owner's own list is the only place a draft, a held listing or a
   * hidden one is visible to them; discovery shows public listings only.
   */
  describe('mine', () => {
    it('lists the owner’s listings in every status, most recently changed first', async () => {
      const draft = database.seed({
        updatedAt: new Date('2026-10-01T00:00:00.000Z'),
      });
      const hidden = database.seed({
        status: 'MODERATION_HIDDEN',
        updatedAt: new Date('2026-10-03T00:00:00.000Z'),
      });
      database.seed({ ownerId: OTHER });

      const mine = await service.mine(DONOR);

      expect(mine.map((listing) => listing.id)).toEqual([hidden.id, draft.id]);
      expect(mine.every((listing) => listing.isOwner)).toBe(true);
    });

    it('reports an expired listing as EXPIRED in the list too', async () => {
      database.seed({
        status: 'PUBLISHED',
        publishedAt: new Date('2026-08-01T00:00:00.000Z'),
        expiresAt: new Date('2026-08-31T00:00:00.000Z'),
      });

      const [listing] = await service.mine(DONOR);

      expect(listing.status).toBe('EXPIRED');
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
