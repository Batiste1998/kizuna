import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import { AUTH } from './auth.constants';
import { createAuth } from './auth';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { MeController } from './me.controller';

@Global()
@Module({
  controllers: [MeController],
  providers: [
    {
      provide: AUTH,
      inject: [DatabaseService, ConfigService, MailService],
      useFactory: (database: DatabaseService, config: ConfigService, mailer: MailService) =>
        createAuth({
          db: database.db,
          secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
          baseURL: config.getOrThrow<string>('BETTER_AUTH_URL'),
          trustedOrigins: config.getOrThrow<string[]>('CORS_ORIGINS'),
          mailer,
        }),
    },
    AuthGuard,
    RolesGuard,
  ],
  exports: [AUTH, AuthGuard, RolesGuard],
})
export class AuthModule {}
