import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import helmet from 'helmet';
import { AUTH } from './auth/auth.constants';
import type { Auth } from './auth/auth';

/**
 * Shared application wiring used by both the runtime bootstrap and e2e tests.
 *
 * The Better Auth handler MUST be mounted before any body parser, so the host
 * app is expected to be created with `{ bodyParser: false }`.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const auth = app.get<Auth>(AUTH);

  // Security headers (OWASP): CSP, HSTS, X-Content-Type-Options, frameguard…
  // crossOriginResourcePolicy is relaxed so the web app (other origin) can
  // embed files served by the API (uploads, PDF).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // CORS must run BEFORE the Better Auth handler so cross-origin preflights
  // (OPTIONS) and credentialed responses get the right headers.
  app.enableCors({
    origin: config.getOrThrow<string[]>('CORS_ORIGINS'),
    credentials: true,
  });

  app.use('/api/auth', toNodeHandler(auth));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
}
