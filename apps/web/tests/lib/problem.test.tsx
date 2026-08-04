import { parseApiProblem } from '@/lib/api/problem';

describe('parseApiProblem', () => {
  it('returns a valid API problem without blindly casting it', () => {
    expect(
      parseApiProblem({
        code: 'AUTH_REQUIRED',
        message: 'Bạn cần đăng nhập',
        correlationId: 'request-123',
      }),
    ).toEqual({
      code: 'AUTH_REQUIRED',
      message: 'Bạn cần đăng nhập',
      correlationId: 'request-123',
    });
  });

  it.each([
    undefined,
    null,
    'server error',
    { code: '', message: 'Lỗi', correlationId: '' },
    { code: 'BROKEN', message: 42, correlationId: 'request-123' },
  ])('returns a stable Vietnamese fallback for malformed input %#', (input) => {
    expect(parseApiProblem(input)).toEqual({
      code: 'UNKNOWN_ERROR',
      message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
      correlationId: 'unknown',
    });
  });
});
