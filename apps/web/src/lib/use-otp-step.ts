'use client';

import { useState } from 'react';
import type { PhoneActionState } from './action-state';

type OtpStep = 'phone' | 'code';

/**
 * Derives the two-step (enter phone -> enter code) UI state for an OTP
 * flow driven by a useActionState result.
 *
 * This intentionally does NOT use useEffect. Calling setState from inside
 * an effect in response to another piece of state changing causes an
 * extra render pass and trips the react-hooks/set-state-in-effect lint
 * rule. Instead this follows React's documented "adjusting state when a
 * value changes" pattern: compare the incoming state against what was
 * seen on the previous render and update synchronously during render.
 * https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 */
export function useOtpStep(otpState: PhoneActionState) {
  const [step, setStep] = useState<OtpStep>('phone');
  const [phone, setPhone] = useState('');
  const [previousOtpState, setPreviousOtpState] = useState(otpState);

  if (otpState !== previousOtpState) {
    setPreviousOtpState(otpState);
    if (otpState.status === 'otp-sent') {
      setPhone(otpState.phone);
      setStep('code');
    }
  }

  return { step, setStep, phone } as const;
}
