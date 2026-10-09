import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppError from '@/app/(app)/error';
import AppLoading from '@/app/(app)/loading';

/**
 * Both files exist because the API sleeps on Render's free tier: without
 * loading.tsx a returning member stared at a blank tab for up to a minute,
 * and without error.tsx a failed /v1/me replaced the app with Next's
 * untranslated "Application error". Neither had a test, so deleting either
 * one left the suite green.
 */
describe('signed-in app loading state', () => {
  it('tells the member the server may be waking up, in Vietnamese', () => {
    render(<AppLoading />);

    expect(screen.getByText('Đang tải không gian của bạn…')).toBeVisible();
    expect(screen.getByText(/mất tới một phút để khởi động/)).toBeVisible();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('signed-in app error state', () => {
  it('explains the failure in Vietnamese and retries in place', async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<AppError error={new Error('fetch failed')} reset={reset} />);

    expect(
      screen.getByRole('heading', { name: 'Không tải được nội dung' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('never shows the raw error message to the member', () => {
    render(
      <AppError
        error={new Error('connect ECONNREFUSED 10.0.0.5:5432')}
        reset={() => {}}
      />,
    );

    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument();
  });

  it('offers a way back to the home page', () => {
    render(<AppError error={new Error('x')} reset={() => {}} />);

    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute(
      'href',
      '/trang-chu',
    );
  });
});
