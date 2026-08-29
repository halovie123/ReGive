'use client';

import { Button } from '@/components/ui/button';
import { signInWithFacebook, signInWithGoogle } from './auth-actions';

/**
 * Interactive sign-in options: Google and Facebook OAuth. Rendered by
 * app/(auth)/login/page.tsx.
 *
 * Phone/OTP sign-in was removed (no paid SMS gateway) — see
 * lib/onboarding-step.ts for the onboarding-flow side of this change.
 */
export function LoginForm() {
  return (
    <div className="auth-card">
      <div>
        <h1>Đăng nhập ReGive</h1>
        <p className="auth-lead">Chọn cách đăng nhập phù hợp với bạn.</p>
      </div>

      <div className="auth-oauth">
        <form action={signInWithGoogle}>
          <Button type="submit" variant="secondary">
            Tiếp tục với Google
          </Button>
        </form>
        <form action={signInWithFacebook}>
          <Button type="submit" variant="secondary">
            Tiếp tục với Facebook
          </Button>
        </form>
      </div>
    </div>
  );
}
