import { render, screen } from '@testing-library/react';
import { LoginForm } from '@/features/auth/login-form';

vi.mock('@/features/auth/auth-actions', () => ({
  signInWithGoogle: vi.fn(),
  signInWithFacebook: vi.fn(),
}));

describe('LoginForm', () => {
  it('offers Google and Facebook sign-in', () => {
    render(<LoginForm />);

    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tiếp tục với Facebook' })).toBeVisible();
  });
});
