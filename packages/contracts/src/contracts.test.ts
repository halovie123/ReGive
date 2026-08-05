import { describe, expect, it } from 'vitest';
import {
  AREA_CODES,
  ApiProblemSchema,
  AreaCodeSchema,
  IdentityClaimsSchema,
  MeResponseSchema,
  UpdateAreasSchema,
  UpdateProfileSchema,
  UpdateRolesSchema,
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

  it('normalizes a valid profile update and defaults the optional bio', () => {
    expect(
      UpdateProfileSchema.parse({ displayName: '  Linh  ' }),
    ).toEqual({ displayName: 'Linh', bio: '' });
  });

  it('rejects an invalid onboarding role or area request', () => {
    expect(UpdateRolesSchema.safeParse({ roles: ['ADMIN'] }).success).toBe(
      false,
    );
    expect(
      UpdateAreasSchema.safeParse({ areas: ['DISTRICT_1'] }).success,
    ).toBe(false);
  });

  it('publishes a safe, complete current-user response', () => {
    expect(
      MeResponseSchema.parse({
        id: '6d29e5a2-12b9-4e91-9d2e-06a4b6d63915',
        phoneVerified: false,
        phoneLast4: null,
        profile: {
          displayName: 'Linh',
          bio: 'Chia sẻ đồ dùng',
          avatarKey: null,
        },
        roles: ['DONOR'],
        activeRole: 'DONOR',
        areas: ['HOC_MON'],
      }),
    ).toEqual({
      id: '6d29e5a2-12b9-4e91-9d2e-06a4b6d63915',
      phoneVerified: false,
      phoneLast4: null,
      profile: {
        displayName: 'Linh',
        bio: 'Chia sẻ đồ dùng',
        avatarKey: null,
      },
      roles: ['DONOR'],
      activeRole: 'DONOR',
      areas: ['HOC_MON'],
    });
  });
});
