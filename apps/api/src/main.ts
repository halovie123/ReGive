import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { resolveApiPort } from './api-port';
import { envSchema } from './common/config/env.schema';
import { ApiExceptionFilter } from './common/http/api-exception.filter';
import { IdentityModule } from './modules/identity/identity.module';
import { ListingsModule } from './modules/listings/listings.module';
import { ProfilesModule } from './modules/profiles/profiles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (configuration) => envSchema.parse(configuration),
    }),
    AppModule,
    IdentityModule,
    ProfilesModule,
    ListingsModule,
  ],
})
class BootstrapModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(BootstrapModule);
  // Advertising the framework only helps someone matching known CVEs.
  app.disable('x-powered-by');
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen(resolveApiPort(process.env.PORT));
}
void bootstrap();
