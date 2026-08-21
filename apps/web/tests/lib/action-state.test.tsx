import { mapSupabaseAuthError } from '@/lib/action-state';

const GENERIC_ERROR = 'Đã xảy ra lỗi. Vui lòng thử lại.';

describe('mapSupabaseAuthError', () => {
  it.each([
    ['Email rate limit exceeded', 'Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau ít phút.'],
    ['Invalid phone number', 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.'],
    ['Token has expired', 'Mã xác thực không đúng hoặc đã hết hạn.'],
  ])('translates the handled case %s', (message, expected) => {
    expect(mapSupabaseAuthError(message)).toBe(expected);
  });

  it.each([
    undefined,
    '',
    'Signups not allowed for this instance',
    'Database error saving new user',
    'User already registered',
  ])('never leaks the raw provider message %#', (message) => {
    expect(mapSupabaseAuthError(message)).toBe(GENERIC_ERROR);
  });
});
