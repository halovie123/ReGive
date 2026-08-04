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

@Controller('failures')
class FailureController {
  @Get('safe')
  safeFailure(): never {
    throw new HttpException(
      {
        code: 'INVALID_INPUT',
        message: 'Dữ liệu không hợp lệ',
        details: { field: 'displayName' },
        internal: 'must-not-leak',
      },
      422,
    );
  }

  @Get('unexpected')
  unexpectedFailure(): never {
    throw new Error('database password=must-not-leak');
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

  it('preserves a safe HTTP status and response while reusing a valid correlation ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/failures/safe')
      .set('x-correlation-id', 'request-123')
      .expect(422);

    expect(response.headers['x-correlation-id']).toBe('request-123');
    expect(response.body).toEqual({
      code: 'INVALID_INPUT',
      message: 'Dữ liệu không hợp lệ',
      correlationId: 'request-123',
      details: { field: 'displayName' },
    });
    expect(JSON.stringify(response.body)).not.toContain('must-not-leak');
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
});
