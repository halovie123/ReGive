import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ListingResponse, ListingStatus } from '@buy-nothing/contracts';
import { changeListingStatus } from '@/features/listings/listing-actions';
import { ListingDetail } from '@/features/listings/listing-detail';

vi.mock('@/features/listings/listing-actions', () => ({
  changeListingStatus: vi.fn(async () => ({ status: 'idle' })),
}));

const changeStatusMock = vi.mocked(changeListingStatus);

const listing = (overrides: Partial<ListingResponse> = {}): ListingResponse => ({
  id: 'listing-1',
  title: 'Bộ sách giáo khoa lớp 5',
  description: 'Đủ 10 cuốn, còn sạch, có bọc bìa. Phù hợp cho năm học mới.',
  defects: 'Hai cuốn bị quăn góc',
  category: 'BOOKS',
  condition: 'GOOD',
  areaCode: 'HOC_MON',
  status: 'PUBLISHED',
  isOwner: false,
  publishedAt: '2026-10-04T08:00:00.000Z',
  expiresAt: '2026-11-03T08:00:00.000Z',
  createdAt: '2026-10-04T07:00:00.000Z',
  updatedAt: '2026-10-04T08:00:00.000Z',
  ...overrides,
});

describe('ListingDetail', () => {
  beforeEach(() => changeStatusMock.mockClear());

  it('shows the item, its defects and its district', () => {
    render(<ListingDetail listing={listing()} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Bộ sách giáo khoa lớp 5' }),
    ).toBeVisible();
    expect(screen.getByText('Hai cuốn bị quăn góc')).toBeVisible();
    expect(screen.getByText('Hóc Môn')).toBeVisible();
  });

  it('gives other members no owner controls', () => {
    render(<ListingDetail listing={listing()} />);

    expect(screen.queryByRole('button', { name: /Rút bài/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sửa bài' })).not.toBeInTheDocument();
    expect(screen.queryByText('Đang hiển thị')).not.toBeInTheDocument();
  });

  it('tells the owner what a held listing means and how to fix it', () => {
    render(<ListingDetail listing={listing({ isOwner: true, status: 'PENDING_REVIEW' })} />);

    expect(screen.getByText('Đang chờ duyệt')).toBeVisible();
    expect(screen.getByText(/số điện thoại, đường link hoặc giá tiền/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Sửa bài' })).toHaveAttribute(
      'href',
      '/vat-pham/listing-1/sua',
    );
  });

  it('lets the owner publish a draft', async () => {
    const user = userEvent.setup();
    render(<ListingDetail listing={listing({ isOwner: true, status: 'DRAFT' })} />);

    await user.click(screen.getByRole('button', { name: 'Đăng tặng' }));

    const form = changeStatusMock.mock.calls[0][1];
    expect(form.get('action')).toBe('publish');
    expect(form.get('listingId')).toBe('listing-1');
  });

  /**
   * A withdrawn listing cannot come back, so withdrawing takes a second,
   * explicit confirmation.
   */
  it('asks for confirmation before withdrawing', async () => {
    const user = userEvent.setup();
    render(<ListingDetail listing={listing({ isOwner: true })} />);

    await user.click(screen.getByRole('button', { name: 'Rút bài' }));
    expect(changeStatusMock).not.toHaveBeenCalled();
    expect(screen.getByText(/không thể khôi phục/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Xác nhận rút bài' }));
    expect(changeStatusMock.mock.calls[0][1].get('action')).toBe('withdraw');
  });

  it('shows the API’s message when an owner action fails', async () => {
    changeStatusMock.mockResolvedValueOnce({
      status: 'error',
      message: 'Hãy mô tả khuyết điểm của vật phẩm, hoặc ghi “Không có”.',
    });
    const user = userEvent.setup();
    render(<ListingDetail listing={listing({ isOwner: true, status: 'DRAFT' })} />);

    await user.click(screen.getByRole('button', { name: 'Đăng tặng' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('khuyết điểm');
  });

  it.each<ListingStatus>(['WITHDRAWN', 'EXPIRED', 'MODERATION_HIDDEN', 'COMPLETED'])(
    'offers no edit or withdraw for a %s listing',
    (status) => {
      render(<ListingDetail listing={listing({ isOwner: true, status })} />);

      expect(screen.queryByRole('link', { name: 'Sửa bài' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Rút bài' })).not.toBeInTheDocument();
    },
  );
});
