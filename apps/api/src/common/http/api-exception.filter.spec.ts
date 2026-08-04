import {
  Controller,
  Get,
  HttpException,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from './api-exception.filter';
import { PublicApiException } from './public-api.exception';

@Controller('failures')
class FailureController {
  @Get('safe')
  safeFailure(): never {
    throw new HttpException(
      {
        code: 'INVALID_INPUT_PASSWORD_LEAK',
        message: 'database password=must-not-leak',
        details: {
          field: 'displayName',
          stack: 'must-not-leak-stack',
          secret: 'must-not-leak-secret',
          internal: { query: 'must-not-leak-query' },
        },
      },
      422,
    );
  }

  @Get('server-http')
  serverHttpFailure(): never {
    throw new HttpException(
      {
        code: 'DATABASE_PASSWORD_LEAK',
        message: 'database password=must-not-leak',
        details: {
          stack: 'must-not-leak-stack',
          secret: 'must-not-leak-secret',
        },
      },
      503,
    );
  }

  @Get('conflict')
  conflictFailure(): never {
    throw new HttpException(
      {
        code: 'INTERNAL_CONFLICT_CODE',
        message: 'internal conflict details must-not-leak',
        details: { secret: 'must-not-leak-secret' },
      },
      409,
    );
  }

  @Get('unexpected')
  unexpectedFailure(): never {
    throw new Error('database password=must-not-leak');
  }

  @Get('public-phone-verification')
  publicPhoneVerificationFailure(): never {
    throw new PublicApiException(
      403,
      'PHONE_NOT_VERIFIED',
      'A confirmed phone number is required.',
    );
  }
}

describe('ApiExceptionFilter', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FailureController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter({ error: () => undefined }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('uses a status-derived public problem for an arbitrary 4xx body', async () => {
    const response = await request(app.getHttpServer())
      .get('/failures/safe')
      .set('x-correlation-id', 'request-123')
      .expect(422);

    expect(response.headers['x-correlation-id']).toBe('request-123');
    expect(response.body).toEqual({
      code: 'UNPROCESSABLE_ENTITY',
      message: 'Dữ liệu không hợp lệ',
      correlationId: 'request-123',
    });
    expect(JSON.stringify(response.body)).not.toContain('must-not-leak');
  });

  it('uses a generic public problem for an HttpException with a 5xx status', async () => {
    const response = await request(app.getHttpServer())
      .get('/failures/server-http')
      .set('x-correlation-id', 'request-503')
      .expect(503);

    expect(response.body).toEqual({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
      correlationId: 'request-503',
    });
    expect(JSON.stringify(response.body)).not.toContain('DATABASE_PASSWORD');
    expect(JSON.stringify(response.body)).not.toContain('must-not-leak');
    expect(JSON.stringify(response.body)).not.toContain('details');
  });

  it('uses a safe status-derived problem for a conflict response', async () => {
    const response = await request(app.getHttpServer())
      .get('/failures/conflict')
      .set('x-correlation-id', 'request-409')
      .expect(409);

    expect(response.body).toEqual({
      code: 'CONFLICT',
      message: 'Dữ liệu bị xung đột.',
      correlationId: 'request-409',
    });
    expect(JSON.stringify(response.body)).not.toContain('must-not-leak');
  });

  it('reuses a valid request ID when no correlation ID is provided', async () => {
    const response = await request(app.getHttpServer())
      .get('/failures/safe')
      .set('x-request-id', 'request-fallback')
      .expect(422);

    expect(response.headers['x-correlation-id']).toBe('request-fallback');
    expect(response.body).toMatchObject({ correlationId: 'request-fallback' });
  });

  it('falls back to a valid request ID when the correlation ID is malformed', async () => {
    const response = await request(app.getHttpServer())
      .get('/failures/safe')
      .set('x-correlation-id', 'unsafe id with spaces')
      .set('x-request-id', 'request-fallback')
      .expect(422);

    expect(response.headers['x-correlation-id']).toBe('request-fallback');
    expect(response.body).toMatchObject({ correlationId: 'request-fallback' });
  });

  it('generates a correlation ID and hides unexpected exception details', async () => {
    const response = await request(app.getHttpServer())
      .get('/failures/unexpected')
      .set('x-request-id', 'unsafe id with spaces')
      .expect(500);

    expect(response.headers['x-correlation-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.body).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
      correlationId: response.headers['x-correlation-id'],
    });
    expect(JSON.stringify(response.body)).not.toContain('password');
    expect(JSON.stringify(response.body)).not.toContain('stack');
  });

  it('preserves only an explicitly allowlisted public problem code', async () => {
    const response = await request(app.getHttpServer())
      .get('/failures/public-phone-verification')
      .set('x-correlation-id', 'request-phone')
      .expect(403);

    expect(response.body).toEqual({
      code: 'PHONE_NOT_VERIFIED',
      message: 'A confirmed phone number is required.',
      correlationId: 'request-phone',
    });
  });
});
