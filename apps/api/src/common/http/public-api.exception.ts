import { HttpException } from '@nestjs/common';

/**
 * Every problem code the API is allowed to show a caller. The phone codes
 * (PHONE_NOT_VERIFIED, PHONE_NOT_CONFIRMED, PHONE_INVALID,
 * IDENTITY_PROVIDER_UNAVAILABLE) were removed with phone/OTP sign-in — a
 * dead union member is an invitation to build the removed feature back.
 */
export type PublicProblemCode =
  | 'AUTH_REQUIRED'
  | 'ACCOUNT_SUSPENDED'
  | 'INVALID_INPUT'
  | 'NOT_READY'
  | 'ROLE_NOT_ASSIGNED'
  | 'AREA_UNAVAILABLE'
  | 'AREA_SELECTION_INVALID';

export type PublicProblem = {
  code: PublicProblemCode;
  message: string;
};

export class PublicApiException extends HttpException {
  constructor(status: number, code: PublicProblemCode, message: string) {
    super({ code, message } satisfies PublicProblem, status);
  }

  get publicProblem(): PublicProblem {
    return this.getResponse() as PublicProblem;
  }
}
