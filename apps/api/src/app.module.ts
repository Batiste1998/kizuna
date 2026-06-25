import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AccessModule } from './access/access.module';
import { AuthModule } from './auth/auth.module';
import { AlternantsModule } from './alternants/alternants.module';
import { BilansModule } from './bilans/bilans.module';
import { CompetencesModule } from './competences/competences.module';
import { DocumentsModule } from './documents/documents.module';
import { EcheancierModule } from './echeancier/echeancier.module';
import { JournalModule } from './journal/journal.module';
import { MessagerieModule } from './messagerie/messagerie.module';
import { NotificationsModule } from './notifications/notifications.module';
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
    DatabaseModule,
    AccessModule,
    AuthModule,
    AlternantsModule,
    BilansModule,
    CompetencesModule,
    DocumentsModule,
    EcheancierModule,
    JournalModule,
    MessagerieModule,
    NotificationsModule,
    SupportModule,
    HealthModule,
  ],
})
export class AppModule {}
