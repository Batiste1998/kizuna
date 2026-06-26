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
  { key: 'alternant', label: 'Alternant', tagline: 'Suivi de compétences & journal' },
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

export function roleLabel(key: RoleKey): string {
  return ROLE_LABELS[key];
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
  /** Playful "trading card" overall rating and stats (homage, not real metrics). */
  rating: number;
  position: string;
  stats: [number, number, number, number, number, number];
}

/** Labels for the six trading-card stats (shared across personas). */
export const STAT_LABELS = ['SUI', 'COM', 'EXP', 'RÉA', 'ORG', 'ENG'] as const;

/**
 * Illustrated "sticker" avatar from DiceBear (no key, returns an SVG). Seeded by
 * the persona name so each face is stable and distinct.
 */
export function personaAvatar(seed: string): string {
  const params = new URLSearchParams({ seed, radius: '0', backgroundColor: 'transparent' });
  return `https://api.dicebear.com/9.x/adventurer/svg?${params.toString()}`;
}

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
    rating: 87,
    position: 'ALT',
    stats: [88, 84, 86, 85, 89, 92],
  },
  {
    key: 'tuteur_pedagogique',
    email: 'peda@kizuna.dev',
    name: 'Théo Lambert',
    firstName: 'Théo',
    persona: 'Évalue les compétences et conduit les bilans.',
    group: 'trinome',
    rating: 91,
    position: 'TUT-P',
    stats: [93, 90, 94, 88, 90, 89],
  },
  {
    key: 'tuteur_entreprise',
    email: 'entreprise@kizuna.dev',
    name: 'Eva Roussel',
    firstName: 'Eva',
    persona: 'Valide le journal et le suivi côté entreprise.',
    group: 'trinome',
    rating: 89,
    position: 'TUT-E',
    stats: [90, 88, 92, 90, 86, 88],
  },
  {
    key: 'admin',
    email: 'admin@kizuna.dev',
    name: 'Nadia Brun',
    firstName: 'Nadia',
    persona: 'Gère promotions, entreprises et trinômes de l’école.',
    group: 'plateforme',
    rating: 90,
    position: 'ADM',
    stats: [89, 92, 88, 91, 93, 90],
  },
  {
    key: 'super_admin',
    email: 'superadmin@kizuna.dev',
    name: 'Super Admin',
    firstName: 'Super',
    persona: 'Pilote la plateforme et tous les établissements.',
    group: 'plateforme',
    rating: 94,
    position: 'S-A',
    stats: [95, 90, 96, 93, 94, 92],
  },
  {
    key: 'support',
    email: 'support@kizuna.dev',
    name: 'Sami Kadri',
    firstName: 'Sami',
    persona: 'Traite les tickets et accompagne les écoles.',
    group: 'plateforme',
    rating: 88,
    position: 'SUP',
    stats: [86, 93, 87, 92, 88, 90],
  },
];
