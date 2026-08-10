'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { INITIAL_PHONE_ACTION_STATE } from '@/lib/action-state';
import { useOtpStep } from '@/lib/use-otp-step';
import { requestPhoneChangeOtp, verifyPhoneChangeOtp } from './onboarding-actions';

/**
 * Confirms a phone number for a user who already has a session (e.g. from
 * Google/Facebook sign-in) but no verified phone yet. Used by
 * app/(onboarding)/onboarding/phone/page.tsx.
 */
export function PhoneForm() {
  const [otpState, requestOtpAction, requestPending] = useActionState(
    requestPhoneChangeOtp,
    INITIAL_PHONE_ACTION_STATE,
  );
  const [verifyState, verifyOtpAction, verifyPending] = useActionState(
    verifyPhoneChangeOtp,
    INITIAL_PHONE_ACTION_STATE,
  );
  const { step, setStep, phone } = useOtpStep(otpState);

  if (step === 'phone') {
    return (
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
    );
  }

  return (
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
  );
}
