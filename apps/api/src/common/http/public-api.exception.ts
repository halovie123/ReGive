import { HttpException } from '@nestjs/common';

export type PublicProblemCode =
  | 'AUTH_REQUIRED'
  | 'ACCOUNT_SUSPENDED'
  | 'PHONE_NOT_VERIFIED'
  | 'PHONE_NOT_CONFIRMED'
  | 'PHONE_INVALID'
  | 'IDENTITY_PROVIDER_UNAVAILABLE'
  | 'INVALID_INPUT'
  | 'ROLE_NOT_ASSIGNED'
  | 'AREA_UNAVAILABLE';

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
