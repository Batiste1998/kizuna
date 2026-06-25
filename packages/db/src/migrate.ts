import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { DATABASE_URL } from './env';
import { createDb } from './client';

async function main() {
  const { db, client } = createDb(DATABASE_URL, { max: 1 });
  console.log('▶ Applying migrations…');
  await migrate(db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
  console.log('✓ Migrations applied');
  await client.end();
}

main().catch((err) => {
  console.error('✗ Migration failed:', err);
  process.exit(1);
});
