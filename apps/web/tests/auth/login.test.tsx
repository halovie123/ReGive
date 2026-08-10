import { render, screen } from '@testing-library/react';
import { LoginForm } from '@/features/auth/login-form';

vi.mock('@/features/auth/auth-actions', () => ({
  signInWithGoogle: vi.fn(),
  signInWithFacebook: vi.fn(),
  requestPhoneOtp: vi.fn(async (state: unknown) => state),
  verifyPhoneOtp: vi.fn(async (state: unknown) => state),
}));

describe('LoginForm', () => {
  it('offers Google, Facebook and phone number sign-in', () => {
    render(<LoginForm />);

    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tiếp tục với Facebook' })).toBeVisible();
    expect(screen.getByLabelText('Số điện thoại')).toBeVisible();
  });

  it('starts on the phone step, without a code input yet', () => {
    render(<LoginForm />);

    expect(screen.getByRole('button', { name: 'Gửi mã OTP' })).toBeVisible();
    expect(screen.queryByLabelText('Mã xác thực')).not.toBeInTheDocument();
  });
});
