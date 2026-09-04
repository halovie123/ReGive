import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AREA_CODES } from '@buy-nothing/contracts';
import { OnboardingForm } from '@/features/onboarding/onboarding-form';
import { submitOnboardingProfile } from '@/features/onboarding/onboarding-actions';

vi.mock('@/features/onboarding/onboarding-actions', () => ({
  submitOnboardingProfile: vi.fn(async () => ({ status: 'idle' })),
}));

const submitOnboardingProfileMock = vi.mocked(submitOnboardingProfile);

describe('OnboardingForm', () => {
  beforeEach(() => {
    submitOnboardingProfileMock.mockClear();
  });

  it('renders the profile, role and area fields needed to finish onboarding', () => {
    render(<OnboardingForm />);

    expect(screen.getByLabelText('Tên hiển thị')).toBeVisible();
    expect(
      screen.getByRole('checkbox', { name: /Người tặng/ }),
    ).toBeVisible();
    expect(
      screen.getByRole('checkbox', { name: /Người nhận/ }),
    ).toBeVisible();
    expect(
      screen.getByRole('checkbox', { name: /Tình nguyện viên/ }),
    ).toBeVisible();
    // Every Ho Chi Minh City district is offered, not just the original
    // four Hóc Môn communes — the form maps over AREA_CODES, so a dropped
    // or renamed district shows up here.
    expect(screen.getByRole('checkbox', { name: 'Hóc Môn' })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Quận 1' })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'TP. Thủ Đức' })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Cần Giờ' })).toBeVisible();
    expect(
      screen.getAllByRole('checkbox').filter((box) =>
        AREA_CODES.includes(
          (box as HTMLInputElement).value as (typeof AREA_CODES)[number],
        ),
      ),
    ).toHaveLength(AREA_CODES.length);
    expect(screen.getByRole('button', { name: 'Hoàn tất đăng ký' })).toBeVisible();
  });

  it('shows validation errors and does not submit when required fields are missing', async () => {
    const user = userEvent.setup();
    render(<OnboardingForm />);

    await user.click(screen.getByRole('button', { name: 'Hoàn tất đăng ký' }));

    expect(await screen.findByText('Chọn ít nhất một vai trò.')).toBeVisible();
    expect(screen.getByText('Chọn ít nhất một khu vực (tối đa 4).')).toBeVisible();
    expect(submitOnboardingProfileMock).not.toHaveBeenCalled();
  });

  it('submits the chosen profile, roles and areas', async () => {
    const user = userEvent.setup();
    render(<OnboardingForm />);

    await user.type(screen.getByLabelText('Tên hiển thị'), 'Nguyễn Thị Lan');
    await user.click(screen.getByRole('checkbox', { name: /Người tặng/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Hóc Môn' }));
    await user.click(screen.getByRole('button', { name: 'Hoàn tất đăng ký' }));

    expect(await screen.findByRole('button', { name: 'Hoàn tất đăng ký' })).toBeEnabled();
    expect(submitOnboardingProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'Nguyễn Thị Lan',
        roles: ['DONOR'],
        areas: ['HOC_MON'],
      }),
    );
  });

  it('surfaces a server-side error without losing the entered data', async () => {
    submitOnboardingProfileMock.mockResolvedValueOnce({
      status: 'error',
      message: 'Dữ liệu không hợp lệ.',
    });
    const user = userEvent.setup();
    render(<OnboardingForm />);

    await user.type(screen.getByLabelText('Tên hiển thị'), 'Nguyễn Thị Lan');
    await user.click(screen.getByRole('checkbox', { name: /Người tặng/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Hóc Môn' }));
    await user.click(screen.getByRole('button', { name: 'Hoàn tất đăng ký' }));

    expect(await screen.findByText('Dữ liệu không hợp lệ.')).toBeVisible();
    expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('Nguyễn Thị Lan');
  });
});
