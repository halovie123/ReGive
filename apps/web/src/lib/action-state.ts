/**
 * Shared, plain (non-"use server") types/values used by both
 * features/auth/auth-actions.ts and features/onboarding/onboarding-actions.ts,
 * and by the Client Components that drive them via useActionState.
 *
 * These must NOT live inside a "use server" file: a file with a top-level
 * 'use server' directive may only export async functions (every export
 * becomes a server reference). A plain constant or a synchronous helper
 * exported from such a file breaks the Server Actions build transform.
 */

export type PhoneActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'otp-sent'; phone: string };

export const INITIAL_PHONE_ACTION_STATE: PhoneActionState = { status: 'idle' };

export type ProfileActionState = { status: 'idle' } | { status: 'error'; message: string };

const GENERIC_ERROR = 'Đã xảy ra lỗi. Vui lòng thử lại.';

export function mapSupabaseAuthError(message: string | undefined): string {
  const normalized = (message ?? '').toLowerCase();
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau ít phút.';
  }
  if (normalized.includes('invalid') && normalized.includes('phone')) {
    return 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.';
  }
  if (normalized.includes('token') || normalized.includes('otp') || normalized.includes('code')) {
    return 'Mã xác thực không đúng hoặc đã hết hạn.';
  }
  return message || GENERIC_ERROR;
}
