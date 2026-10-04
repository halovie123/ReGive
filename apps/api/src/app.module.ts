import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthController } from './health.controller';

/**
 * Liveness/readiness surface only. The Nest scaffold's AppController lived
 * here and served "Hello World!" at the API root; it reached production
 * that way. Every route this API owns is deliberate, so nothing answers at
 * the root.
 */
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
