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
