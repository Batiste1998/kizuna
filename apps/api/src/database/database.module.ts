import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/** Provides the shared Drizzle client across the whole app. */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
