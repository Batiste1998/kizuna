import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDb, type Database } from '@kizuna/db';
import type { Sql } from 'postgres';

/**
 * Owns the long-lived Drizzle client for the API and closes the underlying
 * connection pool on shutdown.
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  public readonly db: Database;
  private readonly client: Sql;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('DATABASE_URL');
    const { db, client } = createDb(url);
    this.db = db;
    this.client = client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.end();
  }
}
