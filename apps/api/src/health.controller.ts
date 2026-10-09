import { Controller, Get, HttpStatus } from '@nestjs/common';
import { PublicApiException } from './common/http/public-api.exception';
import { PrismaService } from './common/prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness. Deliberately touches nothing: a slow or unreachable database
   * must not get the process killed and restarted, which would only make an
   * outage worse. Use /ready to decide whether to send traffic.
   */
  @Get('health')
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /**
   * Readiness. /health alone returned a hard-coded ok, so a dead database
   * still reported healthy and nothing upstream could tell a serving
   * instance from one failing every request.
   *
   * The driver error is swallowed on purpose — this endpoint is
   * unauthenticated, and a raw connection error names the database host,
   * port and user.
   */
  @Get('ready')
  async ready(): Promise<{ status: 'ready' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new PublicApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'NOT_READY',
        'Hệ thống đang khởi động. Vui lòng thử lại sau giây lát.',
      );
    }
    return { status: 'ready' };
  }
}
