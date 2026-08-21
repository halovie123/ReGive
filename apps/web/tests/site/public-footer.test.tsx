import { render, screen, within } from '@testing-library/react';
import Home from '@/app/page';
import { PublicFooter } from '@/components/site/public-footer';

const PUBLIC_PAGES = [
  ['Cách hoạt động', '/cach-hoat-dong'],
  ['Nguyên tắc cộng đồng', '/nguyen-tac-cong-dong'],
  ['An toàn', '/an-toan'],
  ['Điều khoản sử dụng', '/dieu-khoan'],
  ['Quyền riêng tư', '/quyen-rieng-tu'],
  ['Trợ giúp', '/tro-giup'],
] as const;

describe('PublicFooter', () => {
  it.each(PUBLIC_PAGES)('links to %s', (label, href) => {
    render(<PublicFooter />);

    expect(screen.getByRole('link', { name: label })).toHaveAttribute(
      'href',
      href,
    );
  });
});

describe('landing page public navigation', () => {
  it('reaches every public page through the footer', () => {
    render(<Home />);

    const footer = screen.getByRole('navigation', {
      name: 'Liên kết trang công khai',
    });
    for (const [label, href] of PUBLIC_PAGES) {
      expect(within(footer).getByRole('link', { name: label })).toHaveAttribute(
        'href',
        href,
      );
    }
  });

  it('opens the real "Cách hoạt động" page rather than an in-page anchor', () => {
    render(<Home />);

    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    expect(
      within(nav).getByRole('link', { name: 'Cách hoạt động' }),
    ).toHaveAttribute('href', '/cach-hoat-dong');
    expect(
      screen.getByRole('link', { name: 'Tìm hiểu cách hoạt động' }),
    ).toHaveAttribute('href', '/cach-hoat-dong');
  });
});
