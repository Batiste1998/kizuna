import { defineConfig } from 'drizzle-kit';
import { DATABASE_URL } from './src/env';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: DATABASE_URL },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
