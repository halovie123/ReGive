import { isPlausibleOtpCode, normalizeVietnamesePhone } from '@/lib/phone';

describe('normalizeVietnamesePhone', () => {
  it.each([
    ['0901234567', '+84901234567'],
    ['090 123 4567', '+84901234567'],
    ['090-123-4567', '+84901234567'],
    ['+84901234567', '+84901234567'],
    ['84901234567', '+84901234567'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeVietnamesePhone(input)).toBe(expected);
  });

  it.each(['', '   ', '123', 'abcdefghi', '+', '0123'])(
    'returns null for invalid input %#',
    (input) => {
      expect(normalizeVietnamesePhone(input)).toBeNull();
    },
  );
});

describe('isPlausibleOtpCode', () => {
  it.each(['1234', '123456', '12345678'])('accepts %s', (input) => {
    expect(isPlausibleOtpCode(input)).toBe(true);
  });

  it.each(['', '12', 'abcdef', '123456789'])('rejects %s', (input) => {
    expect(isPlausibleOtpCode(input)).toBe(false);
  });
});
