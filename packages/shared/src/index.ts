/**
 * @kizuna/shared — API contracts shared between the NestJS back-end and the
 * TanStack Start front-end. Single source of truth for the domain enums and
 * the response/request shapes that both sides must agree on.
 */

/** Platform roles carried on `user.role`. */
export const APP_ROLES = ['user', 'super_admin', 'support'] as const;
export type AppRole = (typeof APP_ROLES)[number];

/** Establishment roles carried on `member.role`. */
export const MEMBER_ROLES = [
  'owner',
  'admin',
  'tuteur_pedagogique',
  'tuteur_entreprise',
  'alternant',
] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** Roles an establishment admin may assign when onboarding a member. */
export const CREATABLE_MEMBER_ROLES = [
  'admin',
  'tuteur_pedagogique',
  'tuteur_entreprise',
  'alternant',
] as const;
export type CreatableMemberRole = (typeof CREATABLE_MEMBER_ROLES)[number];

export const COMPETENCE_LEVELS = ['NA', 'EC', 'A', 'M'] as const;
export type CompetenceLevel = (typeof COMPETENCE_LEVELS)[number];

export const EVALUATOR_ROLES = ['auto', 'peda', 'entreprise'] as const;
export type EvaluatorRole = (typeof EVALUATOR_ROLES)[number];

export const JOURNAL_STATUSES = ['pending', 'validated', 'changes_requested'] as const;
export type JournalStatus = (typeof JOURNAL_STATUSES)[number];

export const BILAN_STATUSES = ['planned', 'done', 'signed'] as const;
export type BilanStatus = (typeof BILAN_STATUSES)[number];

/** Response of `GET /me` — drives role-aware navigation on the client. */
export interface MeResponse {
  id: string;
  email: string;
  name: string;
  /** Platform role (see {@link APP_ROLES}). */
  role: string;
  /** Establishment roles (see {@link MEMBER_ROLES}). */
  memberRoles: string[];
  isAlternant: boolean;
  twoFactorEnabled: boolean;
}

/** Body of `POST /admin/members`. */
export interface CreateMemberInput {
  name: string;
  email: string;
  role: CreatableMemberRole;
  promotionId?: string;
}
