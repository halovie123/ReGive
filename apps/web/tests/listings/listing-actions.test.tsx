import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  addDonorRole,
  changeListingStatus,
  loadMoreListings,
  saveListing,
} from '@/features/listings/listing-actions';
import { ApiProblemError, apiFetch, getMe } from '@/lib/api/server-fetch';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/server-fetch', async () => {
  const actual = await vi.importActual<object>('@/lib/api/server-fetch');
  return { ...actual, apiFetch: vi.fn(), getMe: vi.fn() };
});

const apiFetchMock = vi.mocked(apiFetch);
const redirectMock = vi.mocked(redirect);

const values = {
  title: 'Bộ sách giáo khoa lớp 5',
  description: 'Đủ 10 cuốn, còn sạch, có bọc bìa. Phù hợp cho năm học mới.',
  defects: 'Hai cuốn bị quăn góc',
  category: 'BOOKS',
  condition: 'GOOD',
  areaCode: 'HOC_MON',
} as const;

const problem = (code: string, message: string) =>
  new ApiProblemError({ code, message, correlationId: 'c-1' });

const calledPaths = () =>
  apiFetchMock.mock.calls.map(([path, init]) => `${init?.method ?? 'GET'} ${path}`);

describe('saveListing', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    redirectMock.mockReset();
  });

  it('creates and then publishes, landing on the listing', async () => {
    apiFetchMock
      .mockResolvedValueOnce({ id: 'listing-1' })
      .mockResolvedValueOnce({ id: 'listing-1', status: 'PUBLISHED' });

    await saveListing({ values, intent: 'publish' });

    expect(calledPaths()).toEqual([
      'POST /listings',
      'POST /listings/listing-1/publish',
    ]);
    expect(redirectMock).toHaveBeenCalledWith('/vat-pham/listing-1');
  });

  it('saves a draft without publishing it', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'listing-1' });

    await saveListing({ values, intent: 'save' });

    expect(calledPaths()).toEqual(['POST /listings']);
    expect(redirectMock).toHaveBeenCalledWith('/vat-pham/listing-1');
  });

  it('edits an existing listing with PATCH', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'listing-9' });

    await saveListing({ values, intent: 'save', listingId: 'listing-9' });

    expect(calledPaths()).toEqual(['PATCH /listings/listing-9']);
  });

  /**
   * Checked before anything is written, so a donor who forgot the defects
   * does not end up with a stray draft plus an error.
   */
  it('asks for defects before publishing, without creating anything', async () => {
    const result = await saveListing({
      values: { ...values, defects: '  ' },
      intent: 'publish',
    });

    expect(result).toEqual({
      status: 'error',
      message: 'Hãy mô tả khuyết điểm của vật phẩm, hoặc ghi “Không có”.',
    });
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('refuses invalid input without calling the API', async () => {
    const result = await saveListing({
      values: { ...values, title: 'Tủ' },
      intent: 'save',
    });

    expect(result.status).toBe('error');
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('shows the API’s Vietnamese message and does not redirect', async () => {
    apiFetchMock.mockRejectedValueOnce(
      problem('DONOR_ROLE_REQUIRED', 'Bạn cần đăng ký vai trò Người tặng để đăng vật phẩm.'),
    );

    await expect(saveListing({ values, intent: 'publish' })).resolves.toEqual({
      status: 'error',
      message: 'Bạn cần đăng ký vai trò Người tặng để đăng vật phẩm.',
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  /**
   * The draft exists once creation succeeded. Landing on it shows its
   * status and lets the donor publish again, rather than an error over a
   * form whose content is already saved.
   */
  it('lands on the saved draft when publishing fails after creation', async () => {
    apiFetchMock
      .mockResolvedValueOnce({ id: 'listing-1' })
      .mockRejectedValueOnce(problem('API_TIMEOUT', 'Máy chủ phản hồi quá lâu.'));

    await saveListing({ values, intent: 'publish' });

    expect(redirectMock).toHaveBeenCalledWith('/vat-pham/listing-1');
  });
});

describe('changeListingStatus', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    vi.mocked(revalidatePath).mockReset();
  });

  const form = (action: string, id = 'listing-1') => {
    const data = new FormData();
    data.set('action', action);
    data.set('listingId', id);
    return data;
  };

  it.each(['publish', 'withdraw'])('posts %s and refreshes the pages that show it', async (action) => {
    apiFetchMock.mockResolvedValueOnce({ id: 'listing-1' });

    await expect(
      changeListingStatus({ status: 'idle' }, form(action)),
    ).resolves.toEqual({ status: 'idle' });

    expect(calledPaths()).toEqual([`POST /listings/listing-1/${action}`]);
    expect(revalidatePath).toHaveBeenCalledWith('/vat-pham/listing-1');
    expect(revalidatePath).toHaveBeenCalledWith('/bai-dang-cua-toi');
  });

  it('refuses an action it does not know', async () => {
    const result = await changeListingStatus({ status: 'idle' }, form('delete'));

    expect(result.status).toBe('error');
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('reports the API’s message', async () => {
    apiFetchMock.mockRejectedValueOnce(
      problem('LISTING_INCOMPLETE', 'Hãy mô tả khuyết điểm của vật phẩm, hoặc ghi “Không có”.'),
    );

    await expect(
      changeListingStatus({ status: 'idle' }, form('publish')),
    ).resolves.toMatchObject({ status: 'error', message: expect.stringContaining('khuyết điểm') });
  });
});

describe('loadMoreListings', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('asks for the next page with the same filters', async () => {
    apiFetchMock.mockResolvedValueOnce({ items: [], nextCursor: null });

    await loadMoreListings('category=BOOKS&area=HOC_MON', 'cursor-1');

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/discovery/listings?category=BOOKS&area=HOC_MON&cursor=cursor-1',
    );
  });

  it('returns null instead of throwing when the API fails', async () => {
    apiFetchMock.mockRejectedValueOnce(new Error('boom'));

    await expect(loadMoreListings('', 'cursor-1')).resolves.toBeNull();
  });

  it('returns null for a response that breaks the contract', async () => {
    apiFetchMock.mockResolvedValueOnce({ items: 'nope' });

    await expect(loadMoreListings('', 'cursor-1')).resolves.toBeNull();
  });
});

describe('addDonorRole', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('adds DONOR to the roles the member already has', async () => {
    vi.mocked(getMe).mockResolvedValueOnce({
      id: 'user-1',
      profile: { displayName: 'Lan', bio: '', avatarKey: null },
      roles: ['RECIPIENT'],
      activeRole: 'RECIPIENT',
      areas: ['HOC_MON'],
    });
    apiFetchMock.mockResolvedValueOnce({});

    await addDonorRole();

    expect(apiFetchMock).toHaveBeenCalledWith('/me/roles', {
      method: 'PUT',
      body: JSON.stringify({ roles: ['RECIPIENT', 'DONOR'] }),
    });
  });
});
