import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AccessModule } from './access/access.module';
import { AuthModule } from './auth/auth.module';
import { AlternantsModule } from './alternants/alternants.module';
import { BilansModule } from './bilans/bilans.module';
import { CompetencesModule } from './competences/competences.module';
import { EcheancierModule } from './echeancier/echeancier.module';
import { JournalModule } from './journal/journal.module';
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
    EcheancierModule,
    JournalModule,
    HealthModule,
  ],
})
export class AppModule {}
