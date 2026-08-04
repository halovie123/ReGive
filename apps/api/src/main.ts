import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { resolveApiPort } from './api-port';
import { envSchema } from './common/config/env.schema';
import { ApiExceptionFilter } from './common/http/api-exception.filter';
import { IdentityModule } from './modules/identity/identity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (configuration) => envSchema.parse(configuration),
    }),
    AppModule,
    IdentityModule,
  ],
})
class BootstrapModule {}

async function bootstrap() {
  const app = await NestFactory.create(BootstrapModule);
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen(resolveApiPort(process.env.PORT));
}
void bootstrap();
