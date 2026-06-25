import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
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
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
