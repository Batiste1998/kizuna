import { config } from 'dotenv';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

// Load the monorepo root .env before reading any env-derived value (same as seed-users.ts).
config({ path: resolve(process.cwd(), '../../.env') });

import { eq } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { createDb, schema } from '@kizuna/db';
import { createAuth } from './auth/auth';
import type {
  BilanStatus,
  CompetenceLevel,
  DocumentCategory,
  EvaluatorRole,
  JournalStatus,
  NotificationType,
} from '@kizuna/db';

/**
 * Full demo seed for Kizuna.
 *
 * WIPES every application + auth table, then repopulates a realistic dataset:
 * several schools, promotions, companies, ~25 apprentices each with a trinôme,
 * journal entries, competency evaluations, bilans, échéances, documents,
 * messages and notifications.
 *
 * Idempotent by design: it TRUNCATEs everything first, so it can be re-run.
 *
 * The 6 demo accounts (page /demo) are preserved with their exact emails, the
 * shared password `Password123!` and their roles. The demo alternant (Léa
 * Marin) is fully populated. The admin (Nadia Brun) is admin of TWO schools so
 * the SchoolSwitcher shows multiple établissements.
 */

const PASSWORD = 'Password123!';

// Keep the original demo org id so existing references/expectations hold; it
// becomes "ESGI Paris", the home of the 6 demo accounts.
const ORG_PARIS = 'org_kizuna_demo';
const ORG_LYON = 'org_esgi_lyon';
const ORG_NANTES = 'org_epitech_nantes';
const ORG_DESCARTES = 'org_cfa_descartes';

const REF_FULLSTACK = '11111111-1111-1111-1111-111111111111';
const REF_CYBER = '22222222-2222-2222-2222-222222222222';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const rand = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (p: number) => Math.random() < p;
const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
const FULLSTACK_BLOCS: Array<{ code: string; label: string; competences: string[] }> = [
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

const CYBER_BLOCS: Array<{ code: string; label: string; competences: string[] }> = [
  {
    code: 'BC01',
    label: "Analyser les risques de sécurité d'un système d'information",
    competences: [
      'Cartographier le système et ses actifs',
      "Réaliser une analyse de risques (EBIOS Risk Manager)",
      'Définir une politique de sécurité (PSSI)',
    ],
  },
  {
    code: 'BC02',
    label: 'Sécuriser une infrastructure et un système',
    competences: [
      'Durcir les configurations système et réseau',
      'Mettre en place le cloisonnement et la segmentation réseau',
      'Gérer les identités et les accès (IAM)',
    ],
  },
  {
    code: 'BC03',
    label: 'Détecter et répondre aux incidents de sécurité',
    competences: [
      'Superviser via un SIEM et qualifier les alertes',
      'Conduire une investigation forensic',
      "Gérer la réponse à incident et le plan de continuité",
    ],
  },
  {
    code: 'BC04',
    label: "Tester la sécurité d'une application et d'un réseau",
    competences: [
      'Conduire un test d\'intrusion (pentest)',
      'Identifier les vulnérabilités OWASP Top 10',
      "Rédiger un rapport d'audit et des recommandations",
    ],
  },
];

const SCHOOLS = [
  { id: ORG_PARIS, name: 'ESGI Paris', slug: 'esgi-paris', type: 'École', city: 'Paris' },
  { id: ORG_LYON, name: 'ESGI Lyon', slug: 'esgi-lyon', type: 'École', city: 'Lyon' },
  { id: ORG_NANTES, name: 'Epitech Nantes', slug: 'epitech-nantes', type: 'École', city: 'Nantes' },
  {
    id: ORG_DESCARTES,
    name: 'CFA Descartes',
    slug: 'cfa-descartes',
    type: 'CFA',
    city: 'Marne-la-Vallée',
  },
];

const COMPANY_NAMES: Array<{ name: string; sector: string; city: string }> = [
  { name: 'Acme Tech', sector: 'Édition logicielle', city: 'Paris' },
  { name: 'Doctolib', sector: 'E-santé', city: 'Levallois-Perret' },
  { name: 'Capgemini', sector: 'ESN', city: 'Paris' },
  { name: 'OVHcloud', sector: 'Cloud', city: 'Roubaix' },
  { name: 'Dataiku', sector: 'Data / IA', city: 'Paris' },
  { name: 'BlaBlaCar', sector: 'Mobilité', city: 'Paris' },
  { name: 'Qonto', sector: 'Fintech', city: 'Paris' },
  { name: 'Back Market', sector: 'E-commerce', city: 'Paris' },
  { name: 'Alan', sector: 'Assurtech', city: 'Paris' },
  { name: 'Sopra Steria', sector: 'ESN', city: 'Nantes' },
  { name: 'Worldline', sector: 'Paiement', city: 'Lyon' },
  { name: 'Decathlon Digital', sector: 'Retail tech', city: 'Lille' },
  { name: 'Thales SIX', sector: 'Cybersécurité', city: 'Gennevilliers' },
  { name: 'Orange Cyberdefense', sector: 'Cybersécurité', city: 'Lyon' },
];

const FIRST_NAMES = [
  'Lucas', 'Emma', 'Hugo', 'Chloé', 'Nathan', 'Camille', 'Louis', 'Manon', 'Gabriel', 'Sarah',
  'Jules', 'Inès', 'Adam', 'Jade', 'Raphaël', 'Lina', 'Arthur', 'Louise', 'Tom', 'Anaïs',
  'Maxime', 'Clara', 'Antoine', 'Margaux', 'Yanis', 'Océane', 'Mathis', 'Zoé', 'Enzo', 'Julie',
  'Romain', 'Maëlys', 'Quentin', 'Léna', 'Baptiste', 'Romane', 'Axel', 'Eva', 'Noah', 'Mila',
];
const LAST_NAMES = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy',
  'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux',
  'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier', 'Blanc', 'Guerin', 'Boyer',
  'Garnier', 'Chevalier', 'Francois', 'Legrand', 'Gauthier', 'Perrin', 'Robin', 'Clement',
];

const JOURNAL_TOPICS = [
  {
    title: 'Mise en place du pipeline CI/CD',
    content:
      "Cette semaine, j'ai configuré le pipeline GitHub Actions du projet : lint, tests unitaires et build Docker. J'ai aussi documenté les étapes pour l'équipe.",
  },
  {
    title: 'Refonte de la page tableau de bord',
    content:
      "J'ai retravaillé l'écran d'accueil en React avec TanStack Query. Travail sur l'accessibilité (navigation clavier) et les états de chargement.",
  },
  {
    title: 'Conception du modèle de données',
    content:
      "Atelier de modélisation avec mon tuteur entreprise. Nous avons défini les tables principales et les relations, puis écrit les migrations Drizzle.",
  },
  {
    title: 'Intégration de l\'authentification',
    content:
      "Mise en place de l'auth avec gestion des rôles et 2FA. J'ai écrit des tests d'intégration sur les routes protégées.",
  },
  {
    title: 'Optimisation des requêtes SQL',
    content:
      "Analyse des requêtes lentes via EXPLAIN ANALYZE, ajout d'index pertinents. Le temps de réponse de l'API a été divisé par trois.",
  },
  {
    title: 'Sprint review et rétrospective',
    content:
      "Participation à la review de sprint : démonstration de mes deux tickets. En rétro, j'ai proposé d'améliorer notre process de relecture de PR.",
  },
  {
    title: 'Audit d\'accessibilité RGAA',
    content:
      "J'ai mené un audit d'accessibilité sur le parcours d'inscription et corrigé les contrastes et les libellés ARIA manquants.",
  },
  {
    title: 'Mise en production de la v1.2',
    content:
      "Déploiement supervisé en production avec rollback préparé. Surveillance des logs et des métriques pendant 24h, aucun incident.",
  },
];

const REVIEW_OK = [
  'Très bon compte rendu, continue ainsi.',
  'Travail sérieux et bien documenté. Validé.',
  'Belle progression, le niveau de détail est apprécié.',
];
const REVIEW_CHANGES = [
  'Merci de préciser les difficultés rencontrées et comment tu les as résolues.',
  'Peux-tu ajouter les liens vers les PR et un peu plus de contexte technique ?',
  'Bon début, mais détaille davantage ta contribution personnelle.',
];

const MESSAGES = [
  'Bonjour, voici mon compte rendu de la semaine, n\'hésitez pas si vous avez des remarques.',
  "Merci pour ton journal, je le relis aujourd'hui.",
  'On peut caler le prochain point hebdo jeudi 14h ?',
  'Parfait pour jeudi, je bloque le créneau.',
  "N'oublie pas de déposer ta convention signée dans tes documents.",
  "C'est fait, je l'ai ajoutée hier soir.",
  'Bonne progression sur le bloc back-end, on en reparle au prochain bilan.',
  'Merci à vous deux pour le suivi, c\'est très motivant.',
];

const DOC_SAMPLES: Array<{ category: DocumentCategory; name: string; mime: string }> = [
  { category: 'convention', name: 'convention-alternance.pdf', mime: 'application/pdf' },
  { category: 'livret', name: 'livret-apprentissage.pdf', mime: 'application/pdf' },
  { category: 'compte_rendu', name: 'compte-rendu-mensuel.pdf', mime: 'application/pdf' },
  { category: 'bulletin', name: 'bulletin-semestre-1.pdf', mime: 'application/pdf' },
];

const LEVELS: CompetenceLevel[] = ['NA', 'EC', 'A', 'M'];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
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

  // --- 1. WIPE -------------------------------------------------------------
  console.log('▶ Wiping all data…');
  await client.unsafe(`
    TRUNCATE TABLE
      ticket_message, ticket, notification, document, message, echeance, bilan,
      journal_entry, evaluation, association, alternant_profil, competence, bloc,
      referentiel, promotion, entreprise, invitation, two_factor, member,
      session, account, verification, "user", organization
    RESTART IDENTITY CASCADE;
  `);

  // Helper: create a Better Auth user with the shared password, then set name.
  async function createUser(name: string, email: string): Promise<string> {
    const res = await auth.api.signUpEmail({ body: { name, email, password: PASSWORD } });
    const userId = res.user.id;
    await db
      .update(schema.user)
      .set({ name, emailVerified: true })
      .where(eq(schema.user.id, userId));
    return userId;
  }

  function addMember(orgId: string, userId: string, role: string) {
    return db
      .insert(schema.member)
      .values({ id: randomUUID(), organizationId: orgId, userId, role });
  }

  // --- 2. Schools (organizations) -----------------------------------------
  console.log('▶ Creating schools…');
  await db.insert(schema.organization).values(SCHOOLS);

  // --- 3. Référentiels + blocs + compétences ------------------------------
  console.log('▶ Creating référentiels…');
  await db.insert(schema.referentiel).values([
    {
      id: REF_FULLSTACK,
      organizationId: ORG_PARIS,
      code: 'RNCP36400',
      title: 'Développeur Full Stack',
      level: 7,
    },
    {
      id: REF_CYBER,
      organizationId: ORG_PARIS,
      code: 'RNCP37681',
      title: 'Expert en sécurité des systèmes d’information',
      level: 7,
    },
  ]);

  // competenceIds[referentielId] = string[] of competence ids
  const competenceIds: Record<string, string[]> = { [REF_FULLSTACK]: [], [REF_CYBER]: [] };
  for (const [refId, blocs] of [
    [REF_FULLSTACK, FULLSTACK_BLOCS],
    [REF_CYBER, CYBER_BLOCS],
  ] as const) {
    for (const [i, b] of blocs.entries()) {
      const [insertedBloc] = await db
        .insert(schema.bloc)
        .values({ referentielId: refId, code: b.code, label: b.label, position: i })
        .returning();
      const comps = await db
        .insert(schema.competence)
        .values(
          b.competences.map((label, j) => ({
            blocId: insertedBloc.id,
            code: `${b.code}.${j + 1}`,
            label,
            position: j,
          })),
        )
        .returning();
      competenceIds[refId].push(...comps.map((c) => c.id));
    }
  }

  // --- 4. Entreprises ------------------------------------------------------
  console.log('▶ Creating entreprises…');
  // Spread companies across schools; Acme Tech belongs to ESGI Paris (Léa's firm).
  const entrepriseRows = COMPANY_NAMES.map((c, i) => ({
    organizationId: c.name === 'Acme Tech' ? ORG_PARIS : SCHOOLS[i % SCHOOLS.length].id,
    name: c.name,
    sector: c.sector,
    city: c.city,
  }));
  const entreprises = await db.insert(schema.entreprise).values(entrepriseRows).returning();
  const acme = entreprises.find((e) => e.name === 'Acme Tech')!;
  const entreprisesByOrg = (orgId: string) =>
    entreprises.filter((e) => e.organizationId === orgId);

  // --- 5. Promotions -------------------------------------------------------
  console.log('▶ Creating promotions…');
  const promotionSpecs = [
    { org: ORG_PARIS, ref: REF_FULLSTACK, name: 'Dev Full Stack 2025-2027', start: '2025-09-01', end: '2027-08-31' },
    { org: ORG_PARIS, ref: REF_CYBER, name: 'Cybersécurité 2024-2026', start: '2024-09-01', end: '2026-08-31' },
    { org: ORG_LYON, ref: REF_FULLSTACK, name: 'Dev Full Stack 2025-2027', start: '2025-09-01', end: '2027-08-31' },
    { org: ORG_NANTES, ref: REF_FULLSTACK, name: 'Concepteur Logiciel 2024-2026', start: '2024-09-01', end: '2026-08-31' },
    { org: ORG_DESCARTES, ref: REF_CYBER, name: 'Cybersécurité 2025-2027', start: '2025-09-01', end: '2027-08-31' },
  ];
  const promotions = await db
    .insert(schema.promotion)
    .values(
      promotionSpecs.map((p) => ({
        organizationId: p.org,
        referentielId: p.ref,
        name: p.name,
        rncpLevel: 7,
        periodStart: p.start,
        periodEnd: p.end,
      })),
    )
    .returning();
  const promoFullstackParis = promotions[0];

  // --- 6. Demo accounts (the 6 /demo logins) ------------------------------
  console.log('▶ Creating demo accounts…');
  const nadia = await createUser('Nadia Brun', 'admin@kizuna.dev');
  await db.update(schema.user).set({ role: 'user' }).where(eq(schema.user.id, nadia));
  // Nadia administrates TWO schools so the SchoolSwitcher shows multiple écoles.
  await addMember(ORG_PARIS, nadia, 'owner');
  await addMember(ORG_LYON, nadia, 'admin');

  const theo = await createUser('Théo Lambert', 'peda@kizuna.dev');
  await addMember(ORG_PARIS, theo, 'tuteur_pedagogique');

  const eva = await createUser('Eva Roussel', 'entreprise@kizuna.dev');
  await addMember(ORG_PARIS, eva, 'tuteur_entreprise');

  const superAdmin = await createUser('Super Admin', 'superadmin@kizuna.dev');
  await db.update(schema.user).set({ role: 'super_admin' }).where(eq(schema.user.id, superAdmin));

  const support = await createUser('Sami Kadri', 'support@kizuna.dev');
  await db.update(schema.user).set({ role: 'support' }).where(eq(schema.user.id, support));

  const lea = await createUser('Léa Marin', 'alternant@kizuna.dev');
  await addMember(ORG_PARIS, lea, 'alternant');

  // --- 7. Tuteurs (péda + entreprise) per school --------------------------
  console.log('▶ Creating tuteurs…');
  const usedEmails = new Set<string>();
  const emailFor = (first: string, last: string, suffix = '') => {
    const base = `${first}.${last}${suffix}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9.]/g, '');
    let email = `${base}@kizuna.dev`;
    let n = 1;
    while (usedEmails.has(email)) email = `${base}${++n}@kizuna.dev`;
    usedEmails.add(email);
    return email;
  };

  // Per-org pools of pedagogical tutors. Théo (demo) is the Paris pool's first.
  const pedaByOrg: Record<string, string[]> = {};
  const entrepriseTutorByOrg: Record<string, string[]> = {};
  for (const school of SCHOOLS) {
    pedaByOrg[school.id] = school.id === ORG_PARIS ? [theo] : [];
    entrepriseTutorByOrg[school.id] = school.id === ORG_PARIS ? [eva] : [];
    const nbPeda = school.id === ORG_PARIS ? 2 : 3;
    const nbEnt = school.id === ORG_PARIS ? 2 : 3;
    for (let i = 0; i < nbPeda; i++) {
      const first = rand(FIRST_NAMES);
      const last = rand(LAST_NAMES);
      const id = await createUser(`${first} ${last}`, emailFor(first, last, '.peda'));
      await addMember(school.id, id, 'tuteur_pedagogique');
      pedaByOrg[school.id].push(id);
    }
    for (let i = 0; i < nbEnt; i++) {
      const first = rand(FIRST_NAMES);
      const last = rand(LAST_NAMES);
      const id = await createUser(`${first} ${last}`, emailFor(first, last, '.ent'));
      await addMember(school.id, id, 'tuteur_entreprise');
      entrepriseTutorByOrg[school.id].push(id);
    }
  }

  // --- 8. Alternants + profils + trinômes ---------------------------------
  console.log('▶ Creating alternants…');

  interface AlternantCtx {
    userId: string;
    name: string;
    profilId: string;
    orgId: string;
    referentielId: string;
    promotionId: string;
    pedaUserId: string;
    entrepriseTutorUserId: string;
    entrepriseId: string;
    rich: boolean;
  }
  const alternants: AlternantCtx[] = [];

  async function makeAlternant(opts: {
    userId: string;
    name: string;
    orgId: string;
    promotion: (typeof promotions)[number];
    pedaUserId: string;
    entrepriseTutorUserId: string;
    entrepriseId: string;
    rich: boolean;
  }): Promise<AlternantCtx> {
    const [profil] = await db
      .insert(schema.alternantProfil)
      .values({
        userId: opts.userId,
        organizationId: opts.orgId,
        promotionId: opts.promotion.id,
      })
      .returning();
    await db.insert(schema.association).values({
      alternantProfilId: profil.id,
      tuteurPedaUserId: opts.pedaUserId,
      tuteurEntrepriseUserId: opts.entrepriseTutorUserId,
      entrepriseId: opts.entrepriseId,
    });
    const ctx: AlternantCtx = {
      userId: opts.userId,
      name: opts.name,
      profilId: profil.id,
      orgId: opts.orgId,
      referentielId: opts.promotion.referentielId!,
      promotionId: opts.promotion.id,
      pedaUserId: opts.pedaUserId,
      entrepriseTutorUserId: opts.entrepriseTutorUserId,
      entrepriseId: opts.entrepriseId,
      rich: opts.rich,
    };
    alternants.push(ctx);
    return ctx;
  }

  // 8a. Léa — the fully-populated demo alternant.
  await makeAlternant({
    userId: lea,
    name: 'Léa Marin',
    orgId: ORG_PARIS,
    promotion: promoFullstackParis,
    pedaUserId: theo,
    entrepriseTutorUserId: eva,
    entrepriseId: acme.id,
    rich: true,
  });

  // 8b. ~26 other alternants spread across promotions.
  const TOTAL_OTHER = 26;
  for (let i = 0; i < TOTAL_OTHER; i++) {
    const promotion = promotions[i % promotions.length];
    const orgId = promotion.organizationId;
    const first = rand(FIRST_NAMES);
    const last = rand(LAST_NAMES);
    const name = `${first} ${last}`;
    const userId = await createUser(name, emailFor(first, last));
    await addMember(orgId, userId, 'alternant');
    const pedaUserId = rand(pedaByOrg[orgId]);
    const entrepriseTutorUserId = rand(entrepriseTutorByOrg[orgId]);
    const orgFirms = entreprisesByOrg(orgId);
    const firm = orgFirms.length ? rand(orgFirms) : rand(entreprises);
    await makeAlternant({
      userId,
      name,
      orgId,
      promotion,
      pedaUserId,
      entrepriseTutorUserId,
      entrepriseId: firm.id,
      // ~70% of apprentices get rich business data.
      rich: chance(0.7),
    });
  }

  // --- 9. Business data per alternant -------------------------------------
  console.log('▶ Filling business data…');
  const notifRows: Array<typeof schema.notification.$inferInsert> = [];

  for (const a of alternants) {
    const isLea = a.userId === lea;
    const nbJournal = isLea ? 8 : a.rich ? randInt(3, 6) : randInt(0, 1);

    // 9a. Journal entries
    for (let i = 0; i < nbJournal; i++) {
      const topic = rand(JOURNAL_TOPICS);
      const status: JournalStatus =
        i === 0 ? 'pending' : (rand(['validated', 'validated', 'pending', 'changes_requested']) as JournalStatus);
      const created = daysAgo(randInt(2, 120));
      const reviewed =
        status === 'pending' ? null : new Date(created.getTime() + randInt(1, 4) * 86_400_000);
      await db.insert(schema.journalEntry).values({
        alternantProfilId: a.profilId,
        authorUserId: a.userId,
        title: topic.title,
        content: topic.content,
        status,
        reviewerUserId: status === 'pending' ? null : a.entrepriseTutorUserId,
        reviewComment:
          status === 'validated'
            ? rand(REVIEW_OK)
            : status === 'changes_requested'
              ? rand(REVIEW_CHANGES)
              : null,
        reviewedAt: reviewed,
        createdAt: created,
        updatedAt: reviewed ?? created,
      });
    }

    // 9b. Evaluations (tri-evaluation). Léa & rich apprentices get assessed.
    if (isLea || a.rich) {
      const comps = competenceIds[a.referentielId] ?? [];
      // Léa: full coverage. Others: a subset.
      const subset = isLea ? comps : shuffle(comps).slice(0, randInt(4, comps.length));
      const evalValues: Array<typeof schema.evaluation.$inferInsert> = [];
      for (const competenceId of subset) {
        const evaluators: EvaluatorRole[] = ['auto'];
        if (isLea || chance(0.7)) evaluators.push('peda');
        if (isLea || chance(0.7)) evaluators.push('entreprise');
        for (const evaluator of evaluators) {
          evalValues.push({
            alternantProfilId: a.profilId,
            competenceId,
            evaluator,
            level: rand(LEVELS),
            updatedAt: daysAgo(randInt(1, 90)),
          });
        }
      }
      if (evalValues.length) await db.insert(schema.evaluation).values(evalValues);
    }

    // 9c. Bilans
    if (isLea || a.rich) {
      const bilanSpecs: Array<{ label: string; when: Date; status: BilanStatus }> = isLea
        ? [
            { label: 'Bilan de mi-parcours — T1', when: daysAgo(120), status: 'signed' },
            { label: 'Bilan intermédiaire — T2', when: daysAgo(30), status: 'done' },
            { label: 'Bilan de fin de période — T3', when: daysFromNow(45), status: 'planned' },
          ]
        : shuffle([
            { label: 'Bilan de mi-parcours', when: daysAgo(randInt(20, 120)), status: 'signed' as BilanStatus },
            { label: 'Bilan intermédiaire', when: daysFromNow(randInt(10, 60)), status: 'planned' as BilanStatus },
          ]).slice(0, randInt(1, 2));
      for (const b of bilanSpecs) {
        await db.insert(schema.bilan).values({
          alternantProfilId: a.profilId,
          label: b.label,
          scheduledAt: b.when,
          status: b.status,
          summary:
            b.status === 'planned'
              ? null
              : 'Bonne intégration en entreprise, progression conforme aux attendus. Points d’amélioration identifiés sur la rédaction technique.',
          createdByUserId: a.pedaUserId,
        });
      }
    }

    // 9d. Documents
    if (isLea || chance(0.6)) {
      const docs = isLea ? DOC_SAMPLES : shuffle(DOC_SAMPLES).slice(0, randInt(1, 2));
      for (const d of docs) {
        await db.insert(schema.document).values({
          alternantProfilId: a.profilId,
          uploadedByUserId: a.userId,
          category: d.category,
          originalName: d.name,
          storageKey: `seed/${a.profilId}/${randomUUID()}-${d.name}`,
          mimeType: d.mime,
          sizeBytes: randInt(80_000, 2_500_000),
          createdAt: daysAgo(randInt(1, 100)),
        });
      }
    }

    // 9e. Messages in the trinôme thread
    if (isLea || a.rich) {
      const authors = [a.userId, a.pedaUserId, a.entrepriseTutorUserId];
      const nbMsg = isLea ? MESSAGES.length : randInt(2, 5);
      for (let i = 0; i < nbMsg; i++) {
        await db.insert(schema.message).values({
          alternantProfilId: a.profilId,
          authorUserId: authors[i % authors.length],
          body: MESSAGES[i % MESSAGES.length],
          createdAt: daysAgo(randInt(1, 40) + (nbMsg - i)),
        });
      }
    }

    // 9f. Notifications for the apprentice
    if (isLea || a.rich) {
      const notifs: Array<{ type: NotificationType; title: string; detail: string; href: string }> = [
        { type: 'journal', title: 'Entrée de journal validée', detail: 'Votre tuteur a validé votre compte rendu.', href: '/journal' },
        { type: 'message', title: 'Nouveau message', detail: 'Vous avez reçu un message dans votre trinôme.', href: '/messages' },
        { type: 'bilan', title: 'Bilan planifié', detail: 'Un nouveau bilan a été planifié.', href: '/bilans' },
        { type: 'echeance', title: 'Échéance à venir', detail: 'Un livrable arrive bientôt à échéance.', href: '/echeances' },
      ];
      for (const n of shuffle(notifs).slice(0, isLea ? notifs.length : randInt(1, 3))) {
        notifRows.push({
          userId: a.userId,
          type: n.type,
          title: n.title,
          detail: n.detail,
          href: n.href,
          read: chance(0.4),
          createdAt: daysAgo(randInt(0, 20)),
        });
      }
    }
  }

  // --- 10. Échéances per promotion ----------------------------------------
  console.log('▶ Creating échéances…');
  for (const promo of promotions) {
    const items = [
      { title: 'Remise du rapport d’étonnement', desc: 'Premier rapport sur la découverte de l’entreprise.', due: daysAgo(60) },
      { title: 'Soutenance de mi-parcours', desc: 'Présentation orale devant le jury pédagogique.', due: daysAgo(15) },
      { title: 'Dépôt du mémoire — version intermédiaire', desc: 'Première version complète du mémoire.', due: daysFromNow(20) },
      { title: 'Évaluation des compétences — T2', desc: 'Mise à jour du référentiel par le trinôme.', due: daysFromNow(45) },
      { title: 'Soutenance finale', desc: 'Présentation du projet de fin d’études.', due: daysFromNow(120) },
    ];
    for (const it of items) {
      await db.insert(schema.echeance).values({
        promotionId: promo.id,
        title: it.title,
        description: it.desc,
        dueDate: it.due,
        createdByUserId: nadia,
      });
    }
  }

  if (notifRows.length) await db.insert(schema.notification).values(notifRows);

  // Notifications for staff (Théo, Eva) tied to Léa's activity.
  await db.insert(schema.notification).values([
    { userId: theo, type: 'journal', title: 'Compte rendu à relire', detail: 'Léa Marin a soumis une nouvelle entrée.', href: '/journal', read: false },
    { userId: eva, type: 'journal', title: 'Validation en attente', detail: 'Une entrée de Léa Marin attend votre validation.', href: '/journal', read: false },
    { userId: theo, type: 'bilan', title: 'Bilan à préparer', detail: 'Le bilan T3 de Léa Marin approche.', href: '/bilans', read: false },
  ]);

  // --- 11. Support tickets -------------------------------------------------
  console.log('▶ Creating support tickets…');
  const [ticket1] = await db
    .insert(schema.ticket)
    .values({
      subject: 'Impossible de téléverser ma convention',
      type: 'bug',
      priority: 'haute',
      status: 'open',
      requesterUserId: lea,
    })
    .returning();
  await db.insert(schema.ticketMessage).values({
    ticketId: ticket1.id,
    authorUserId: lea,
    body: 'Bonjour, quand je dépose mon PDF de convention, j’obtiens une erreur 500. Merci de votre aide.',
  });
  const [ticket2] = await db
    .insert(schema.ticket)
    .values({
      subject: 'Demande d’ajout d’un référentiel Cybersécurité',
      type: 'demande',
      priority: 'moyenne',
      status: 'in_progress',
      requesterUserId: nadia,
      assigneeUserId: support,
    })
    .returning();
  await db.insert(schema.ticketMessage).values([
    { ticketId: ticket2.id, authorUserId: nadia, body: 'Pourriez-vous ajouter le référentiel RNCP Cybersécurité à notre établissement ?' },
    { ticketId: ticket2.id, authorUserId: support, body: 'Bonjour, c’est en cours de traitement, je reviens vers vous rapidement.' },
  ]);

  // --- 12. Counts ----------------------------------------------------------
  const tables: Array<[string, PgTable]> = [
    ['organizations', schema.organization],
    ['referentiels', schema.referentiel],
    ['promotions', schema.promotion],
    ['entreprises', schema.entreprise],
    ['users', schema.user],
    ['members', schema.member],
    ['alternant_profils', schema.alternantProfil],
    ['associations', schema.association],
    ['journal_entries', schema.journalEntry],
    ['evaluations', schema.evaluation],
    ['bilans', schema.bilan],
    ['echeances', schema.echeance],
    ['documents', schema.document],
    ['messages', schema.message],
    ['notifications', schema.notification],
    ['tickets', schema.ticket],
  ];
  console.log('\n✓ Seed complete. Counts:');
  for (const [label, table] of tables) {
    const rows = await db.select().from(table);
    console.log(`  ${label.padEnd(18)} ${rows.length}`);
  }
  console.log(`\n  Demo accounts (password: ${PASSWORD}):`);
  console.log('    admin@kizuna.dev / peda@kizuna.dev / entreprise@kizuna.dev');
  console.log('    alternant@kizuna.dev / superadmin@kizuna.dev / support@kizuna.dev');
  console.log('  Nadia Brun is admin/owner of ESGI Paris + ESGI Lyon (multi-école).');

  await client.end();
}

main().catch((err) => {
  console.error('✗ Demo seed failed:', err);
  process.exit(1);
});
