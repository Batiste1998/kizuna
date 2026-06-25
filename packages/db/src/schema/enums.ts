import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Application-wide roles (Better Auth admin plugin `user.role`).
 * Platform-level roles transverse to all organizations.
 */
export const APP_ROLES = ['user', 'super_admin', 'support'] as const;
export type AppRole = (typeof APP_ROLES)[number];

/**
 * Organization member roles (Better Auth organization plugin `member.role`).
 * Scoped to an établissement (school).
 */
export const MEMBER_ROLES = [
  'owner',
  'admin',
  'tuteur_pedagogique',
  'tuteur_entreprise',
  'alternant',
] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/**
 * Competence mastery levels (tri-evaluation): Non acquis, En cours, Acquis, Maîtrisé.
 */
export const competenceLevel = pgEnum('competence_level', ['NA', 'EC', 'A', 'M']);
export const COMPETENCE_LEVELS = ['NA', 'EC', 'A', 'M'] as const;
export type CompetenceLevel = (typeof COMPETENCE_LEVELS)[number];

/**
 * Who evaluated a competence in the tripartite model:
 * the apprentice (auto), the school tutor (peda), the company tutor (entreprise).
 */
export const evaluatorRole = pgEnum('evaluator_role', ['auto', 'peda', 'entreprise']);
export const EVALUATOR_ROLES = ['auto', 'peda', 'entreprise'] as const;
export type EvaluatorRole = (typeof EVALUATOR_ROLES)[number];

/**
 * Status of a journal entry: en attente de validation, validé, ou modifications demandées.
 */
export const journalStatus = pgEnum('journal_status', [
  'pending',
  'validated',
  'changes_requested',
]);
export const JOURNAL_STATUSES = ['pending', 'validated', 'changes_requested'] as const;
export type JournalStatus = (typeof JOURNAL_STATUSES)[number];

/**
 * Statut d'un bilan tripartite : planifié, réalisé, signé.
 */
export const bilanStatus = pgEnum('bilan_status', ['planned', 'done', 'signed']);
export const BILAN_STATUSES = ['planned', 'done', 'signed'] as const;
export type BilanStatus = (typeof BILAN_STATUSES)[number];

/**
 * Catégorie d'un document de l'alternant.
 */
export const documentCategory = pgEnum('document_category', [
  'convention',
  'livret',
  'compte_rendu',
  'bulletin',
  'autre',
]);
export const DOCUMENT_CATEGORIES = [
  'convention',
  'livret',
  'compte_rendu',
  'bulletin',
  'autre',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

/** Tickets de support : type, priorité, statut. */
export const ticketType = pgEnum('ticket_type', ['bug', 'demande']);
export const TICKET_TYPES = ['bug', 'demande'] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const ticketPriority = pgEnum('ticket_priority', ['basse', 'moyenne', 'haute']);
export const TICKET_PRIORITIES = ['basse', 'moyenne', 'haute'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const ticketStatus = pgEnum('ticket_status', ['open', 'in_progress', 'resolved']);
export const TICKET_STATUSES = ['open', 'in_progress', 'resolved'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Type d'une notification (sert d'icône/couleur côté front). */
export const notificationType = pgEnum('notification_type', [
  'journal',
  'message',
  'bilan',
  'echeance',
  'ticket',
  'system',
]);
export const NOTIFICATION_TYPES = [
  'journal',
  'message',
  'bilan',
  'echeance',
  'ticket',
  'system',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
