import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Load the monorepo root .env so the db package and scripts share one config.
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../../../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env at the repo root and adjust it.',
  );
}

export const DATABASE_URL = databaseUrl;
