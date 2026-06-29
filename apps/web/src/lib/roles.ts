/** Role metadata for theming and labels, mirroring the Kizuna design system. */
export type RoleKey =
  | 'alternant'
  | 'tuteur_pedagogique'
  | 'tuteur_entreprise'
  | 'admin'
  | 'super_admin'
  | 'support';

export interface RoleMeta {
  key: RoleKey;
  label: string;
  tagline: string;
}

export const ROLES: RoleMeta[] = [
  { key: 'alternant', label: 'Alternant', tagline: 'Compétences & journal de bord' },
  { key: 'tuteur_pedagogique', label: 'Tuteur pédagogique', tagline: 'Évaluation & bilans' },
  { key: 'tuteur_entreprise', label: 'Tuteur entreprise', tagline: 'Validation du journal' },
  { key: 'admin', label: 'Administrateur', tagline: 'Gestion de l’établissement' },
  { key: 'super_admin', label: 'Super Admin', tagline: 'Pilotage de la plateforme' },
  { key: 'support', label: 'Support', tagline: 'Traitement des tickets' },
];

const ROLE_LABELS = Object.fromEntries(ROLES.map((r) => [r.key, r.label])) as Record<
  RoleKey,
  string
>;
const ROLE_TAGLINES = Object.fromEntries(ROLES.map((r) => [r.key, r.tagline])) as Record<
  RoleKey,
  string
>;

export function roleLabel(key: RoleKey): string {
  return ROLE_LABELS[key];
}

export function roleTagline(key: RoleKey): string {
  return ROLE_TAGLINES[key];
}

/** Which demonstration accounts can be entered from the /demo persona picker. */
export type PersonaGroup = 'trinome' | 'plateforme';

export interface DemoPersona {
  key: RoleKey;
  /** Seeded login (see apps/api/src/seed-users.ts), shared password. */
  email: string;
  /** Full name as displayed in-app once signed in. */
  name: string;
  /** First name, used for the avatar initial. */
  firstName: string;
  /** One line describing what this persona does day to day. */
  persona: string;
  group: PersonaGroup;
}

/** Shared password for every seeded demo account (apps/api/src/seed-users.ts). */
export const DEMO_PASSWORD = 'Password123!';

/**
 * The six demo accounts, grouped by Kizuna's real structure: the trinôme (the
 * bond — 絆) and the platform staff behind it. Names mirror the seed so the
 * sidebar shows the same identity the card promised.
 */
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    key: 'alternant',
    email: 'alternant@kizuna.dev',
    name: 'Léa Marin',
    firstName: 'Léa',
    persona: 'Suit ses compétences et tient son journal de bord.',
    group: 'trinome',
  },
  {
    key: 'tuteur_pedagogique',
    email: 'peda@kizuna.dev',
    name: 'Théo Lambert',
    firstName: 'Théo',
    persona: 'Évalue les compétences et conduit les bilans.',
    group: 'trinome',
  },
  {
    key: 'tuteur_entreprise',
    email: 'entreprise@kizuna.dev',
    name: 'Eva Roussel',
    firstName: 'Eva',
    persona: 'Valide le journal et le suivi côté entreprise.',
    group: 'trinome',
  },
  {
    key: 'admin',
    email: 'admin@kizuna.dev',
    name: 'Nadia Brun',
    firstName: 'Nadia',
    persona: 'Gère promotions, entreprises et trinômes de l’école.',
    group: 'plateforme',
  },
  {
    key: 'super_admin',
    email: 'superadmin@kizuna.dev',
    name: 'Super Admin',
    firstName: 'Super',
    persona: 'Pilote la plateforme et tous les établissements.',
    group: 'plateforme',
  },
  {
    key: 'support',
    email: 'support@kizuna.dev',
    name: 'Sami Kadri',
    firstName: 'Sami',
    persona: 'Traite les tickets et accompagne les écoles.',
    group: 'plateforme',
  },
];

/** The trinôme — the three roles bound to the same apprenticeship. */
export const TRINOME_PERSONAS = DEMO_PERSONAS.filter((p) => p.group === 'trinome');

/**
 * Platform staff that can be entered from the demo — super_admin is kept out so
 * nobody signs in with the keys-to-everything account from a public surface.
 */
export const STAFF_PERSONAS = DEMO_PERSONAS.filter(
  (p) => p.group === 'plateforme' && p.key !== 'super_admin',
);

/** The shared subject of the demo: the apprentice the trinôme follows. */
export const SUBJECT_PERSONA = DEMO_PERSONAS.find((p) => p.key === 'alternant');
