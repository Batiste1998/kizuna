import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap(): Promise<void> {
  // Body parser disabled so Better Auth can read raw bodies on its own routes;
  // configureApp re-enables JSON parsing for everything else.
  const app = await NestFactory.create(AppModule, { bodyParser: false, bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  configureApp(app);
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('API_PORT');
  await app.listen(port);
  Logger.log(`Kizuna API ready on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
