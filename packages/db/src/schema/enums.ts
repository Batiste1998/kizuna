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
