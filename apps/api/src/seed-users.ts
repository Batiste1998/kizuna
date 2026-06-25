import { config } from 'dotenv';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

// Load the monorepo root .env before reading any env-derived value.
config({ path: resolve(process.cwd(), '../../.env') });

import { and, eq } from 'drizzle-orm';
import { createDb, schema } from '@kizuna/db';
import { createAuth } from './auth/auth';

const ORG_ID = 'org_kizuna_demo';
const PASSWORD = 'Password123!';

interface DemoUser {
  key: string;
  name: string;
  email: string;
  appRole?: 'super_admin' | 'support';
  memberRole?: 'admin' | 'tuteur_pedagogique' | 'tuteur_entreprise' | 'alternant';
}

const DEMO_USERS: DemoUser[] = [
  {
    key: 'superadmin',
    name: 'Super Admin',
    email: 'superadmin@kizuna.dev',
    appRole: 'super_admin',
  },
  { key: 'support', name: 'Agent Support', email: 'support@kizuna.dev', appRole: 'support' },
  { key: 'admin', name: 'Admin École', email: 'admin@kizuna.dev', memberRole: 'admin' },
  { key: 'peda', name: 'Tuteur Péda', email: 'peda@kizuna.dev', memberRole: 'tuteur_pedagogique' },
  {
    key: 'entreprise',
    name: 'Tuteur Entreprise',
    email: 'entreprise@kizuna.dev',
    memberRole: 'tuteur_entreprise',
  },
  {
    key: 'alternant',
    name: 'Alex Alternant',
    email: 'alternant@kizuna.dev',
    memberRole: 'alternant',
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  const { db, client } = createDb(databaseUrl, { max: 1 });
  const auth = createAuth({
    db,
    secret: process.env.BETTER_AUTH_SECRET ?? 'change-me-in-production',
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
    trustedOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
  });

  console.log('▶ Seeding demo users…');
  const ids: Record<string, string> = {};

  for (const u of DEMO_USERS) {
    const existing = await db.select().from(schema.user).where(eq(schema.user.email, u.email));
    let userId = existing[0]?.id;

    if (!userId) {
      const res = await auth.api.signUpEmail({
        body: { name: u.name, email: u.email, password: PASSWORD },
      });
      userId = res.user.id;
    }
    ids[u.key] = userId;

    if (u.appRole) {
      await db.update(schema.user).set({ role: u.appRole }).where(eq(schema.user.id, userId));
    }

    if (u.memberRole) {
      const member = await db
        .select()
        .from(schema.member)
        .where(and(eq(schema.member.organizationId, ORG_ID), eq(schema.member.userId, userId)));
      if (member.length === 0) {
        await db
          .insert(schema.member)
          .values({ id: randomUUID(), organizationId: ORG_ID, userId, role: u.memberRole });
      }
    }
    console.log(`  ✓ ${u.email} (${u.appRole ?? u.memberRole})`);
  }

  // Apprentice profile + trinôme (association) for the demo alternant.
  const [promo] = await db
    .select()
    .from(schema.promotion)
    .where(eq(schema.promotion.organizationId, ORG_ID));
  const [firm] = await db
    .select()
    .from(schema.entreprise)
    .where(eq(schema.entreprise.organizationId, ORG_ID));

  const existingProfil = await db
    .select()
    .from(schema.alternantProfil)
    .where(eq(schema.alternantProfil.userId, ids.alternant));

  if (existingProfil.length === 0) {
    const [profil] = await db
      .insert(schema.alternantProfil)
      .values({ userId: ids.alternant, organizationId: ORG_ID, promotionId: promo?.id })
      .returning();
    await db.insert(schema.association).values({
      alternantProfilId: profil.id,
      tuteurPedaUserId: ids.peda,
      tuteurEntrepriseUserId: ids.entreprise,
      entrepriseId: firm?.id,
    });
    console.log('  ✓ trinôme alternant ↔ tuteurs ↔ entreprise');
  }

  console.log(`✓ Demo users ready (password: ${PASSWORD})`);
  await client.end();
}

main().catch((err) => {
  console.error('✗ User seed failed:', err);
  process.exit(1);
});
