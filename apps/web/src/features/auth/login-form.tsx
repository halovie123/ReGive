'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { INITIAL_PHONE_ACTION_STATE } from '@/lib/action-state';
import { useOtpStep } from '@/lib/use-otp-step';
import {
  requestPhoneOtp,
  signInWithFacebook,
  signInWithGoogle,
  verifyPhoneOtp,
} from './auth-actions';

/**
 * Interactive sign-in options: OAuth (Google, Facebook) and a two-step
 * phone number OTP flow. Rendered by app/(auth)/login/page.tsx.
 */
export function LoginForm() {
  const [otpState, requestOtpAction, requestPending] = useActionState(
    requestPhoneOtp,
    INITIAL_PHONE_ACTION_STATE,
  );
  const [verifyState, verifyOtpAction, verifyPending] = useActionState(
    verifyPhoneOtp,
    INITIAL_PHONE_ACTION_STATE,
  );
  const { step, setStep, phone } = useOtpStep(otpState);

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

      <p className="auth-divider">hoặc dùng số điện thoại</p>

      {step === 'phone' ? (
        <form className="auth-form" action={requestOtpAction}>
          <Input
            label="Số điện thoại"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="09xxxxxxxx"
            required
            error={otpState.status === 'error' ? otpState.message : undefined}
          />
          <div className="auth-form-actions">
            <Button type="submit" disabled={requestPending}>
              {requestPending ? 'Đang gửi mã...' : 'Gửi mã OTP'}
            </Button>
          </div>
        </form>
      ) : (
        <form className="auth-form" action={verifyOtpAction}>
          <input type="hidden" name="phone" value={phone} />
          <p className="auth-hint">Mã xác thực đã được gửi tới {phone}.</p>
          <Input
            label="Mã xác thực"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            required
            error={verifyState.status === 'error' ? verifyState.message : undefined}
          />
          <div className="auth-form-actions">
            <Button type="button" variant="ghost" onClick={() => setStep('phone')}>
              Đổi số điện thoại
            </Button>
            <Button type="submit" disabled={verifyPending}>
              {verifyPending ? 'Đang xác nhận...' : 'Xác nhận'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
