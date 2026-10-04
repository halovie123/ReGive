import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AREA_CODES } from '@buy-nothing/contracts';
import { saveListing } from '@/features/listings/listing-actions';
import { ListingForm } from '@/features/listings/listing-form';

vi.mock('@/features/listings/listing-actions', () => ({
  saveListing: vi.fn(async () => ({ status: 'idle' })),
}));

const saveListingMock = vi.mocked(saveListing);

async function fillValidListing(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Tên món đồ'), 'Bộ sách giáo khoa lớp 5');
  await user.type(
    screen.getByLabelText('Mô tả'),
    'Đủ 10 cuốn, còn sạch, có bọc bìa. Phù hợp cho năm học mới.',
  );
  await user.type(screen.getByLabelText('Khuyết điểm'), 'Hai cuốn bị quăn góc');
  await user.selectOptions(screen.getByLabelText('Danh mục'), 'BOOKS');
  await user.selectOptions(screen.getByLabelText('Tình trạng'), 'GOOD');
}

describe('ListingForm', () => {
  beforeEach(() => saveListingMock.mockClear());

  it('labels every field in Vietnamese', () => {
    render(<ListingForm preferredAreas={['HOC_MON']} />);

    for (const label of ['Tên món đồ', 'Mô tả', 'Khuyết điểm', 'Danh mục', 'Tình trạng', 'Khu vực trao đồ']) {
      expect(screen.getByLabelText(label)).toBeVisible();
    }
  });

  it('offers only the five allowed categories', () => {
    render(<ListingForm preferredAreas={['HOC_MON']} />);

    const options = within(screen.getByLabelText('Danh mục'))
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value)
      .filter(Boolean);
    expect(options).toEqual(['HOUSEHOLD', 'CLOTHING', 'BOOKS', 'CHILDREN', 'DEVICES']);
  });

  /**
   * Twenty-two districts is a long list. The member's own areas come first,
   * pre-selected, and the rest follow; nothing finer than a district is
   * ever asked for.
   */
  it('puts the member’s own areas first and offers all 22', () => {
    render(<ListingForm preferredAreas={['GO_VAP', 'QUAN_1']} />);

    const area = screen.getByLabelText('Khu vực trao đồ') as HTMLSelectElement;
    const groups = within(area).getAllByRole('group');
    expect(groups[0]).toHaveAttribute('label', 'Khu vực của bạn');
    expect(
      within(groups[0])
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Gò Vấp', 'Quận 1']);
    expect(area.value).toBe('GO_VAP');
    expect(within(area).getAllByRole('option')).toHaveLength(AREA_CODES.length);
    expect(screen.queryByLabelText(/địa chỉ/i)).not.toBeInTheDocument();
  });

  it('prompts for defects, and says “Không có” is a valid answer', () => {
    render(<ListingForm preferredAreas={['HOC_MON']} />);

    expect(screen.getByText(/ghi “Không có”/)).toBeVisible();
  });

  it('publishes with “Đăng tặng”', async () => {
    const user = userEvent.setup();
    render(<ListingForm preferredAreas={['HOC_MON']} />);

    await fillValidListing(user);
    await user.click(screen.getByRole('button', { name: 'Đăng tặng' }));

    expect(saveListingMock).toHaveBeenCalledWith({
      values: expect.objectContaining({
        title: 'Bộ sách giáo khoa lớp 5',
        category: 'BOOKS',
        areaCode: 'HOC_MON',
      }),
      intent: 'publish',
      listingId: undefined,
    });
  });

  it('saves a draft with “Lưu nháp”', async () => {
    const user = userEvent.setup();
    render(<ListingForm preferredAreas={['HOC_MON']} />);

    await fillValidListing(user);
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }));

    expect(saveListingMock).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'save' }),
    );
  });

  it('shows field errors and sends nothing when the listing is incomplete', async () => {
    const user = userEvent.setup();
    render(<ListingForm preferredAreas={['HOC_MON']} />);

    await user.type(screen.getByLabelText('Tên món đồ'), 'Tủ');
    await user.click(screen.getByRole('button', { name: 'Đăng tặng' }));

    expect(await screen.findByText('Tên cần từ 5 đến 100 ký tự.')).toBeVisible();
    expect(screen.getByText('Mô tả cần từ 20 đến 2000 ký tự.')).toBeVisible();
    expect(saveListingMock).not.toHaveBeenCalled();
  });

  it('shows the server’s message without losing what was typed', async () => {
    saveListingMock.mockResolvedValueOnce({
      status: 'error',
      message: 'Bạn cần đăng ký vai trò Người tặng để đăng vật phẩm.',
    });
    const user = userEvent.setup();
    render(<ListingForm preferredAreas={['HOC_MON']} />);

    await fillValidListing(user);
    await user.click(screen.getByRole('button', { name: 'Đăng tặng' }));

    expect(
      await screen.findByText('Bạn cần đăng ký vai trò Người tặng để đăng vật phẩm.'),
    ).toBeVisible();
    expect(screen.getByLabelText('Tên món đồ')).toHaveValue('Bộ sách giáo khoa lớp 5');
  });

  /**
   * A live or held listing is edited in place: saving re-screens it, and
   * there is no separate "publish" step to offer.
   */
  it('edits a live listing with a single save button', async () => {
    const user = userEvent.setup();
    render(
      <ListingForm
        preferredAreas={['HOC_MON']}
        listingId="listing-1"
        allowPublish={false}
        defaultValues={{
          title: 'Bộ sách giáo khoa lớp 5',
          description: 'Đủ 10 cuốn, còn sạch, có bọc bìa. Phù hợp cho năm học mới.',
          defects: 'Hai cuốn bị quăn góc',
          category: 'BOOKS',
          condition: 'GOOD',
          areaCode: 'HOC_MON',
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Đăng tặng' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(saveListingMock).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'save', listingId: 'listing-1' }),
    );
  });
});
