import { Component, type ReactNode } from 'react';
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

  /**
   * On success the action calls redirect(), and Next rejects the client-side
   * action promise with a NEXT_REDIRECT error meant for its RedirectBoundary.
   * Called from react-hook-form's submit handler, that rejection escaped as
   * an unhandled promise rejection on every successful sign-up — a false
   * error in the logs on exactly the happy path. It must reach React's error
   * boundary instead, which in the real app is Next's RedirectBoundary.
   */
  it('hands the success redirect to React rather than leaking it as an unhandled rejection', async () => {
    const redirectError = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;replace;/trang-chu;307;',
    });
    submitOnboardingProfileMock.mockRejectedValueOnce(redirectError);
    const caught: unknown[] = [];
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(
      <CatchBoundary onCatch={(error) => caught.push(error)}>
        <OnboardingForm />
      </CatchBoundary>,
    );

    await user.type(screen.getByLabelText('Tên hiển thị'), 'Nguyễn Thị Lan');
    await user.click(screen.getByRole('checkbox', { name: /Người tặng/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Hóc Môn' }));
    await user.click(screen.getByRole('button', { name: 'Hoàn tất đăng ký' }));

    expect(await screen.findByText('boundary caught')).toBeInTheDocument();
    expect(caught).toEqual([redirectError]);
  });
});

/** Stands in for Next's RedirectBoundary, which the real app wraps pages in. */
class CatchBoundary extends Component<
  { children: ReactNode; onCatch: (error: unknown) => void },
  { caught: boolean }
> {
  state = { caught: false };

  static getDerivedStateFromError() {
    return { caught: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onCatch(error);
  }

  render() {
    return this.state.caught ? <p>boundary caught</p> : this.props.children;
  }
}
