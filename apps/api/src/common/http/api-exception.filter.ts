import type { ApiProblem } from '@buy-nothing/contracts';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

const CORRELATION_HEADER = 'x-correlation-id';
const SAFE_CORRELATION_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const INTERNAL_MESSAGE = 'Đã xảy ra lỗi. Vui lòng thử lại sau.';
const BAD_REQUEST_STATUS: number = HttpStatus.BAD_REQUEST;
const UNAUTHORIZED_STATUS: number = HttpStatus.UNAUTHORIZED;
const FORBIDDEN_STATUS: number = HttpStatus.FORBIDDEN;
const NOT_FOUND_STATUS: number = HttpStatus.NOT_FOUND;
const INTERNAL_SERVER_ERROR_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR;

type HttpExceptionBody = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
};

type ErrorLogger = {
  error(message: unknown): void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const clientMessageForStatus = (status: number): string => {
  if (status >= INTERNAL_SERVER_ERROR_STATUS) return INTERNAL_MESSAGE;
  if (status === BAD_REQUEST_STATUS) return 'Yêu cầu không hợp lệ.';
  if (status === UNAUTHORIZED_STATUS) return 'Bạn cần đăng nhập.';
  if (status === FORBIDDEN_STATUS)
    return 'Bạn không có quyền thực hiện thao tác này.';
  if (status === NOT_FOUND_STATUS) return 'Không tìm thấy tài nguyên.';
  return 'Không thể xử lý yêu cầu.';
};

const codeForStatus = (status: number): string =>
  HttpStatus[status] ?? 'HTTP_ERROR';

const incomingCorrelationId = (request: Request): string => {
  const candidate =
    request.headers[CORRELATION_HEADER] ?? request.headers['x-request-id'];

  return typeof candidate === 'string' && SAFE_CORRELATION_ID.test(candidate)
    ? candidate
    : randomUUID();
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: ErrorLogger = new Logger(ApiExceptionFilter.name),
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const correlationId = incomingCorrelationId(request);
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : INTERNAL_SERVER_ERROR_STATUS;
    const exceptionBody: HttpExceptionBody = isHttpException
      ? this.readHttpExceptionBody(exception)
      : {};

    const problem: ApiProblem = {
      code:
        typeof exceptionBody.code === 'string' && exceptionBody.code.length > 0
          ? exceptionBody.code
          : codeForStatus(status),
      message:
        status < INTERNAL_SERVER_ERROR_STATUS &&
        typeof exceptionBody.message === 'string' &&
        exceptionBody.message.length > 0
          ? exceptionBody.message
          : clientMessageForStatus(status),
      correlationId,
      ...(exceptionBody.details === undefined
        ? {}
        : { details: exceptionBody.details }),
    };

    if (status >= INTERNAL_SERVER_ERROR_STATUS) {
      this.logger.error({
        event: 'api_request_failed',
        status,
        correlationId,
        exceptionType:
          exception instanceof Error ? exception.name : 'UnknownException',
      });
    }

    response.setHeader(CORRELATION_HEADER, correlationId);
    response.status(status).json(problem);
  }

  private readHttpExceptionBody(exception: HttpException): HttpExceptionBody {
    const body = exception.getResponse();

    if (typeof body === 'string') return { message: body };
    if (!isRecord(body)) return {};

    return {
      code: body.code,
      message: body.message,
      details: body.details,
    };
  }
}
