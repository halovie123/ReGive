import {
  ApiProblemSchema,
  type ApiProblem,
} from '@buy-nothing/contracts';

const FALLBACK_API_PROBLEM: ApiProblem = {
  code: 'UNKNOWN_ERROR',
  message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
  correlationId: 'unknown',
};

export const parseApiProblem = (value: unknown): ApiProblem => {
  const result = ApiProblemSchema.safeParse(value);
  return result.success ? result.data : { ...FALLBACK_API_PROBLEM };
};
