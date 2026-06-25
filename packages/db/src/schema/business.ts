import {
  date,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { organization, user } from './auth';
import { bilanStatus, competenceLevel, evaluatorRole, journalStatus } from './enums';

/**
 * Business domain — foundation entities (Jalon 1).
 *
 * An `organization` (Better Auth) IS the établissement (school). The tables below
 * model the apprenticeship domain around it: companies, cohorts, the RNCP
 * competency framework (référentiel → bloc → compétence), apprentice profiles and
 * the tripartite "trinôme" association.
 */

/** Entreprise partenaire rattachée à un établissement. */
export const entreprise = pgTable('entreprise', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sector: text('sector'),
  city: text('city'),
  siret: text('siret'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Référentiel de compétences (ex. titre RNCP). */
export const referentiel = pgTable('referentiel', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').references(() => organization.id, {
    onDelete: 'cascade',
  }),
  code: text('code').notNull(),
  title: text('title').notNull(),
  level: smallint('level'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Bloc de compétences (ex. BC01). */
export const bloc = pgTable(
  'bloc',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    referentielId: uuid('referentiel_id')
      .notNull()
      .references(() => referentiel.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    label: text('label').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('bloc_referentiel_code_uq').on(t.referentielId, t.code)],
);

/** Compétence appartenant à un bloc. */
export const competence = pgTable('competence', {
  id: uuid('id').primaryKey().defaultRandom(),
  blocId: uuid('bloc_id')
    .notNull()
    .references(() => bloc.id, { onDelete: 'cascade' }),
  code: text('code'),
  label: text('label').notNull(),
  description: text('description'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Promotion / cohorte rattachée à un établissement et à un référentiel. */
export const promotion = pgTable('promotion', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  referentielId: uuid('referentiel_id').references(() => referentiel.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  rncpLevel: smallint('rncp_level'),
  periodStart: date('period_start'),
  periodEnd: date('period_end'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Profil métier d'un alternant (1-1 avec un user Better Auth). */
export const alternantProfil = pgTable('alternant_profil', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  promotionId: uuid('promotion_id').references(() => promotion.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Trinôme : alternant + tuteur pédagogique + tuteur entreprise + entreprise. */
export const association = pgTable('association', {
  id: uuid('id').primaryKey().defaultRandom(),
  alternantProfilId: uuid('alternant_profil_id')
    .notNull()
    .unique()
    .references(() => alternantProfil.id, { onDelete: 'cascade' }),
  tuteurPedaUserId: text('tuteur_peda_user_id').references(() => user.id, { onDelete: 'set null' }),
  tuteurEntrepriseUserId: text('tuteur_entreprise_user_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  entrepriseId: uuid('entreprise_id').references(() => entreprise.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Tri-evaluation : one row per (alternant, compétence, évaluateur).
 * The same competence is assessed independently by the alternant (auto), the
 * tuteur pédagogique (peda) and the tuteur d'entreprise (entreprise).
 */
export const evaluation = pgTable(
  'evaluation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    alternantProfilId: uuid('alternant_profil_id')
      .notNull()
      .references(() => alternantProfil.id, { onDelete: 'cascade' }),
    competenceId: uuid('competence_id')
      .notNull()
      .references(() => competence.id, { onDelete: 'cascade' }),
    evaluator: evaluatorRole('evaluator').notNull(),
    level: competenceLevel('level').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('evaluation_unique').on(t.alternantProfilId, t.competenceId, t.evaluator)],
);

/**
 * Journal d'activités : entrées rédigées par l'alternant, validées par le tuteur
 * d'entreprise (workflow pending → validated / changes_requested).
 */
export const journalEntry = pgTable('journal_entry', {
  id: uuid('id').primaryKey().defaultRandom(),
  alternantProfilId: uuid('alternant_profil_id')
    .notNull()
    .references(() => alternantProfil.id, { onDelete: 'cascade' }),
  authorUserId: text('author_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: journalStatus('status').notNull().default('pending'),
  reviewerUserId: text('reviewer_user_id').references(() => user.id, { onDelete: 'set null' }),
  reviewComment: text('review_comment'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Bilan tripartite : réunion alternant + tuteur pédagogique + tuteur d'entreprise,
 * planifiée puis réalisée et signée.
 */
export const bilan = pgTable('bilan', {
  id: uuid('id').primaryKey().defaultRandom(),
  alternantProfilId: uuid('alternant_profil_id')
    .notNull()
    .references(() => alternantProfil.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  status: bilanStatus('status').notNull().default('planned'),
  summary: text('summary'),
  createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
