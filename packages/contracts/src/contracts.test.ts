import { describe, expect, it } from 'vitest';
import {
  AREA_CODES,
  ApiProblemSchema,
  AreaCodeSchema,
  IdentityClaimsSchema,
  UserRoleSchema,
} from './index.js';

describe('shared contracts', () => {
  it('accepts the DONOR role', () => {
    expect(UserRoleSchema.parse('DONOR')).toBe('DONOR');
  });

  it('rejects an unsupported district code', () => {
    expect(AreaCodeSchema?.safeParse('DISTRICT_1').success).toBe(false);
  });

  it.each([
    'HOC_MON',
    'BA_DIEM',
    'XUAN_THOI_SON',
    'DONG_THANH',
  ] as const)('accepts the exact area code %s', (areaCode) => {
    expect(AreaCodeSchema.parse(areaCode)).toBe(areaCode);
  });

  it('publishes exactly the supported area codes', () => {
    expect(AREA_CODES).toEqual([
      'HOC_MON',
      'BA_DIEM',
      'XUAN_THOI_SON',
      'DONG_THANH',
    ]);
  });

  it('parses a Vietnamese API problem', () => {
    expect(
      ApiProblemSchema.parse({
        code: 'AUTH_REQUIRED',
        message: 'Bạn cần đăng nhập',
        correlationId: 'c-1',
      }),
    ).toEqual({
      code: 'AUTH_REQUIRED',
      message: 'Bạn cần đăng nhập',
      correlationId: 'c-1',
    });
  });

  it('rejects malformed API problems', () => {
    expect(
      ApiProblemSchema?.safeParse({
        code: '',
        message: 'Lỗi',
        correlationId: '',
      }).success,
    ).toBe(false);
  });

  it('rejects incomplete identity claims', () => {
    expect(
      IdentityClaimsSchema?.safeParse({ subject: 'user-1' }).success,
    ).toBe(false);
  });
});
