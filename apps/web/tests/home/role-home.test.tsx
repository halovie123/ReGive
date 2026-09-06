import type { MeResponse, UserRole } from '@buy-nothing/contracts';
import { render, screen } from '@testing-library/react';
import { RoleHome } from '@/features/home/role-home';

const meWithRole = (activeRole: UserRole): MeResponse => ({
  id: 'user-1',
  profile: { displayName: 'Lan', bio: '', avatarKey: null },
  roles: [activeRole],
  activeRole,
  areas: ['HOC_MON'],
});

const ROLE_CTAS: [UserRole, string][] = [
  ['DONOR', 'Đăng món đồ mới'],
  ['RECIPIENT', 'Tìm món đồ'],
  ['VOLUNTEER', 'Xem đơn cần vận chuyển'],
];

describe('RoleHome', () => {
  it.each(ROLE_CTAS)(
    'announces the %s call-to-action as not yet available instead of linking to a missing route',
    (role, cta) => {
      render(<RoleHome me={meWithRole(role)} />);

      const button = screen.getByRole('button', { name: cta });
      expect(button).toBeDisabled();
      expect(screen.getByText('Sắp ra mắt')).toBeInTheDocument();
    },
  );

  it.each(ROLE_CTAS)('renders no link at all for %s', (role) => {
    const { container } = render(<RoleHome me={meWithRole(role)} />);

    // /kham-pha (and any create-listing route) do not exist yet, so the
    // home screen must not offer a link that would 404.
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });
});
