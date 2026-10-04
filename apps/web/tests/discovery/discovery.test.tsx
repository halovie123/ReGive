import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DiscoveryListing } from '@buy-nothing/contracts';
import { DiscoveryFilters } from '@/features/discovery/discovery-filters';
import { DiscoveryResults } from '@/features/discovery/discovery-results';
import { discoverySearch } from '@/features/discovery/discovery-search';
import { loadMoreListings } from '@/features/listings/listing-actions';
import { ListingCard } from '@/features/listings/listing-card';

vi.mock('@/features/listings/listing-actions', () => ({
  loadMoreListings: vi.fn(),
}));

const loadMoreMock = vi.mocked(loadMoreListings);

const card = (overrides: Partial<DiscoveryListing> = {}): DiscoveryListing => ({
  id: 'listing-1',
  title: 'Bộ sách giáo khoa lớp 5',
  category: 'BOOKS',
  condition: 'GOOD',
  areaCode: 'HOC_MON',
  publishedAt: '2026-10-04T08:00:00.000Z',
  owner: { displayName: 'Lan', avatarKey: null },
  ...overrides,
});

describe('ListingCard', () => {
  it('links to the listing and names category, condition, area and donor', () => {
    render(<ListingCard listing={card()} />);

    const link = screen.getByRole('link', { name: /Bộ sách giáo khoa lớp 5/ });
    expect(link).toHaveAttribute('href', '/vat-pham/listing-1');
    expect(within(link).getByText('Sách vở · Còn tốt')).toBeVisible();
    expect(within(link).getByText('Hóc Môn')).toBeVisible();
    expect(within(link).getByText('Tặng bởi Lan')).toBeVisible();
  });

  /**
   * The spec forbids showing a precise location or an exact distance; a
   * card names the district and nothing finer.
   */
  it('never shows a distance', () => {
    const { container } = render(<ListingCard listing={card()} />);

    expect(container.textContent).not.toMatch(/\d+(?:[.,]\d+)?\s?(?:km|m)\b/);
    expect(container.textContent).not.toMatch(/cách bạn/i);
  });
});

describe('discoverySearch', () => {
  /**
   * The URL is user-editable. Only known filters with valid values pass
   * through to the API; anything else is dropped rather than turned into
   * a 422 for the whole page.
   */
  it('keeps valid filters and drops everything else', () => {
    expect(
      discoverySearch({
        q: '  sách  ',
        category: 'BOOKS',
        area: 'NOWHERE',
        condition: 'GOOD',
        cursor: 'injected',
        utm_source: 'x',
      }),
    ).toBe('q=s%C3%A1ch&category=BOOKS&condition=GOOD');
  });

  it('takes the first value when a filter is repeated', () => {
    expect(discoverySearch({ area: ['QUAN_1', 'QUAN_3'] })).toBe('area=QUAN_1');
  });
});

describe('DiscoveryFilters', () => {
  /**
   * A plain GET form: filters live in the URL, so a filtered list can be
   * bookmarked, shared and reloaded, and works before JavaScript loads.
   */
  it('submits filters as a GET to /kham-pha, keeping the current values', () => {
    render(
      <DiscoveryFilters values={{ q: 'sách', category: 'BOOKS', area: 'GO_VAP' }} />,
    );

    const form = screen.getByRole('search');
    expect(form).toHaveAttribute('action', '/kham-pha');
    expect(form).toHaveAttribute('method', 'get');
    expect(screen.getByLabelText('Tìm món đồ')).toHaveValue('sách');
    expect(screen.getByLabelText('Danh mục')).toHaveValue('BOOKS');
    expect(screen.getByLabelText('Khu vực')).toHaveValue('GO_VAP');
    expect(screen.getByLabelText('Tình trạng')).toHaveValue('');
  });

  it('offers every district plus “all”', () => {
    render(<DiscoveryFilters values={{}} />);

    expect(within(screen.getByLabelText('Khu vực')).getAllByRole('option')).toHaveLength(23);
  });
});

describe('DiscoveryResults', () => {
  beforeEach(() => loadMoreMock.mockReset());

  it('says so when nothing matches', () => {
    render(<DiscoveryResults initial={{ items: [], nextCursor: null }} search="q=xyz" />);

    expect(screen.getByText('Chưa có món đồ nào phù hợp')).toBeVisible();
  });

  it('appends the next page with the same filters', async () => {
    loadMoreMock.mockResolvedValueOnce({
      items: [card({ id: 'listing-2', title: 'Áo khoác trẻ em size 6' })],
      nextCursor: null,
    });
    const user = userEvent.setup();
    render(
      <DiscoveryResults
        initial={{ items: [card()], nextCursor: 'cursor-1' }}
        search="category=BOOKS"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Xem thêm' }));

    expect(loadMoreMock).toHaveBeenCalledWith('category=BOOKS', 'cursor-1');
    expect(await screen.findByText('Áo khoác trẻ em size 6')).toBeVisible();
    expect(screen.getByText('Bộ sách giáo khoa lớp 5')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Xem thêm' })).not.toBeInTheDocument();
  });

  it('keeps the list and offers a retry when the next page fails', async () => {
    loadMoreMock.mockResolvedValueOnce(null);
    const user = userEvent.setup();
    render(<DiscoveryResults initial={{ items: [card()], nextCursor: 'cursor-1' }} search="" />);

    await user.click(screen.getByRole('button', { name: 'Xem thêm' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải thêm được');
    expect(screen.getByRole('button', { name: 'Xem thêm' })).toBeEnabled();
    expect(screen.getByText('Bộ sách giáo khoa lớp 5')).toBeVisible();
  });
});
