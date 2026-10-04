import { render, screen } from '@testing-library/react';
import NotFound from '@/app/not-found';

/**
 * Signed-out visitors never reach this page — the proxy redirects any
 * unknown path to /login — so in practice it is shown to a signed-in user
 * who mistyped a URL. Without it they got Next's default English
 * "This page could not be found." on an otherwise Vietnamese product.
 */
describe('not-found page', () => {
  it('explains the missing page in Vietnamese', () => {
    render(<NotFound />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Không tìm thấy trang' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/could not be found/i)).not.toBeInTheDocument();
  });

  it('offers a way back into the app', () => {
    render(<NotFound />);

    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute(
      'href',
      '/trang-chu',
    );
  });

  it('offers the help page for anyone who followed a broken link', () => {
    render(<NotFound />);

    expect(screen.getByRole('link', { name: 'Trợ giúp' })).toHaveAttribute(
      'href',
      '/tro-giup',
    );
  });
});
