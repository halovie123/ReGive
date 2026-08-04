import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { resolveApiPort } from './api-port';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  await app.listen(resolveApiPort(process.env.PORT));
}
void bootstrap();
