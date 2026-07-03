import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { MailModule } from './mail/mail.module';
import { AccessModule } from './access/access.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { AlternantsModule } from './alternants/alternants.module';
import { BilansModule } from './bilans/bilans.module';
import { CompetencesModule } from './competences/competences.module';
import { DocumentsModule } from './documents/documents.module';
import { EcheancierModule } from './echeancier/echeancier.module';
import { JournalModule } from './journal/journal.module';
import { MessagerieModule } from './messagerie/messagerie.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { SupportModule } from './support/support.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Single source of truth: the monorepo root .env
      envFilePath: ['../../.env'],
      validate: validateEnv,
    }),
    // Global rate limiting (per IP). Relaxed in tests to keep the e2e suite green.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isTest = config.get<string>('NODE_ENV') === 'test';
        return { throttlers: [{ ttl: 60_000, limit: isTest ? 100_000 : 300 }] };
      },
    }),
    // Cron jobs (échéance reminders).
    ScheduleModule.forRoot(),
    DatabaseModule,
    MailModule,
    AccessModule,
    AdminModule,
    AuthModule,
    AlternantsModule,
    BilansModule,
    CompetencesModule,
    DocumentsModule,
    EcheancierModule,
    JournalModule,
    MessagerieModule,
    NotificationsModule,
    SuperAdminModule,
    SupportModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
