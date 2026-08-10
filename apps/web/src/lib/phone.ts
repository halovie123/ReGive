/**
 * Normalizes a Vietnamese phone number entered by a user into E.164 format
 * (e.g. "0901234567" -> "+84901234567"), which is what Supabase phone auth
 * (signInWithOtp / verifyOtp / updateUser) requires.
 *
 * Accepts numbers already in E.164 form (leading "+") and local Vietnamese
 * mobile numbers starting with "0". Returns null when the input cannot be
 * normalized into a plausible phone number.
 */
export function normalizeVietnamesePhone(input: string): string | null {
  const trimmed = input.trim().replace(/[\s.-]/g, '');
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) {
    return /^\+[1-9][0-9]{7,14}$/.test(trimmed) ? trimmed : null;
  }

  if (trimmed.startsWith('0')) {
    const rest = trimmed.slice(1);
    return /^[0-9]{8,10}$/.test(rest) ? `+84${rest}` : null;
  }

  if (trimmed.startsWith('84')) {
    const rest = trimmed.slice(2);
    return /^[0-9]{8,10}$/.test(rest) ? `+84${rest}` : null;
  }

  return null;
}

/** True when the input looks like a 4-8 digit OTP code. */
export function isPlausibleOtpCode(input: string): boolean {
  return /^[0-9]{4,8}$/.test(input.trim());
}
