import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

export type Schema = typeof schema;

/**
 * Creates a Drizzle client bound to the given connection string.
 * The API owns the long-lived instance; scripts create short-lived ones.
 */
export function createDb(connectionString: string, options?: { max?: number }) {
  const client = postgres(connectionString, { max: options?.max ?? 10 });
  const db = drizzle(client, { schema, casing: 'snake_case' });
  return { db, client };
}

export type Database = ReturnType<typeof createDb>['db'];
