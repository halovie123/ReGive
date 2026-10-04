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

describe('RoleHome', () => {
  it.each<[UserRole, string, string]>([
    ['DONOR', 'Đăng món đồ mới', '/dang-tang'],
    ['RECIPIENT', 'Tìm món đồ', '/kham-pha'],
  ])('sends a %s straight to their main task', (role, cta, href) => {
    render(<RoleHome me={meWithRole(role)} />);

    expect(screen.getByRole('link', { name: cta })).toHaveAttribute('href', href);
    expect(screen.queryByText('Sắp ra mắt')).not.toBeInTheDocument();
  });

  /**
   * Volunteer delivery is Plan 4 and has no route yet. Rather than link to
   * a guaranteed 404, the button says it is not available yet.
   */
  it('announces the volunteer action as not yet available', () => {
    const { container } = render(<RoleHome me={meWithRole('VOLUNTEER')} />);

    expect(screen.getByRole('button', { name: 'Xem đơn cần vận chuyển' })).toBeDisabled();
    expect(screen.getByText('Sắp ra mắt')).toBeInTheDocument();
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });
});
