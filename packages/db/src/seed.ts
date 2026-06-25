import { DATABASE_URL } from './env';
import { createDb } from './client';
import { bloc, competence, entreprise, organization, promotion, referentiel } from './schema/index';

/**
 * Foundation seed: reference/business data that does NOT require auth users.
 * Users, members, apprentice profiles and trinômes are seeded after Better Auth
 * is wired (Jalon 1.4), since they need proper password hashing.
 *
 * Demo référentiel = the real RNCP "Développeur Full Stack" (6 blocs), which is
 * exactly the framework this project is built to validate.
 */

const ORG_ID = 'org_kizuna_demo';
const REFERENTIEL_ID = '11111111-1111-1111-1111-111111111111';

const BLOCS: Array<{ code: string; label: string; competences: string[] }> = [
  {
    code: 'BC01',
    label: "Participer à la gestion d'un projet d'application ou de site web",
    competences: [
      'Participer aux réunions clients et élaborer des réponses adaptées',
      'Participer à la planification réaliste du projet',
      'Appliquer les méthodes agiles (SCRUM, XP)',
    ],
  },
  {
    code: 'BC02',
    label: 'Concevoir et modéliser une application ou un site web',
    competences: [
      "Rédiger les spécifications techniques de besoin (STB) d'un projet",
      "Modéliser l'application logicielle et ses données (méthode standard)",
      "Concevoir l'architecture des bases de données",
      "Déterminer l'architecture logicielle",
    ],
  },
  {
    code: 'BC03',
    label: "Développer la partie front-end d'une application ou d'un site web",
    competences: [
      'Développer le front-end (web, hybride, mobile, desktop)',
      "Appliquer les bonnes pratiques d'UX, de sécurité et d'écoconception",
      'Tester le front-end à plusieurs niveaux',
    ],
  },
  {
    code: 'BC04',
    label: "Développer la partie back-end d'une application ou d'un site web",
    competences: [
      'Développer la couche de persistance des données (sécurité et performance)',
      'Développer la partie back-end (plusieurs langages)',
      'Consommer une API de manière sécurisée (authentification robuste)',
      'Tester le back-end à plusieurs niveaux',
    ],
  },
  {
    code: 'BC05',
    label: 'Déployer et maintenir en production une application ou un site web',
    competences: [
      'Préparer et automatiser la mise en production',
      "Sécuriser et superviser l'application",
      'Produire la documentation technique',
    ],
  },
  {
    code: 'BC06',
    label: 'Mettre en œuvre des solutions techniques contextuelles',
    competences: [
      'Implémenter la conformité RGPD',
      "Assurer l'accessibilité numérique (WCAG)",
      'Optimiser le SEO et mesurer les performances',
    ],
  },
];

async function main() {
  const { db, client } = createDb(DATABASE_URL, { max: 1 });
  console.log('▶ Seeding reference data…');

  await db
    .insert(organization)
    .values({
      id: ORG_ID,
      name: 'CFA Kizuna Démo',
      slug: 'cfa-kizuna-demo',
      type: 'CFA',
      city: 'Lyon',
    })
    .onConflictDoNothing();

  await db
    .insert(referentiel)
    .values({
      id: REFERENTIEL_ID,
      organizationId: ORG_ID,
      code: 'RNCP36400',
      title: 'Développeur Full Stack',
      level: 7,
    })
    .onConflictDoNothing();

  for (const [i, b] of BLOCS.entries()) {
    const [insertedBloc] = await db
      .insert(bloc)
      .values({ referentielId: REFERENTIEL_ID, code: b.code, label: b.label, position: i })
      .onConflictDoNothing()
      .returning();

    if (!insertedBloc) continue; // already seeded
    await db.insert(competence).values(
      b.competences.map((label, j) => ({
        blocId: insertedBloc.id,
        code: `${b.code}.${j + 1}`,
        label,
        position: j,
      })),
    );
  }

  await db
    .insert(entreprise)
    .values({
      organizationId: ORG_ID,
      name: 'Acme Tech',
      sector: 'Édition logicielle',
      city: 'Lyon',
    })
    .onConflictDoNothing();

  await db
    .insert(promotion)
    .values({
      organizationId: ORG_ID,
      referentielId: REFERENTIEL_ID,
      name: 'Promo 2025-2027 — Dev Full Stack',
      rncpLevel: 7,
      periodStart: '2025-09-01',
      periodEnd: '2027-08-31',
    })
    .onConflictDoNothing();

  console.log('✓ Seed done');
  await client.end();
}

main().catch((err) => {
  console.error('✗ Seed failed:', err);
  process.exit(1);
});
