import type { SuperUser } from './api';

/** Badge palette for a role chip (background + text), aligned with the design system. */
export interface Swatch {
  bg: string;
  text: string;
}

export const ROLE_META: Record<string, { label: string; swatch: Swatch }> = {
  super_admin: { label: 'Super admin', swatch: { bg: '#EEF2FD', text: '#3B63CC' } },
  support: { label: 'Support', swatch: { bg: '#EFECFB', text: '#4F40B0' } },
  admin: { label: 'Administrateur', swatch: { bg: '#EAF0F8', text: '#2E5288' } },
  owner: { label: 'Propriétaire', swatch: { bg: '#EAF0F8', text: '#2E5288' } },
  tuteur_pedagogique: { label: 'Tuteur péda.', swatch: { bg: '#E8F4EF', text: '#1F7A63' } },
  tuteur_entreprise: { label: 'Tuteur entr.', swatch: { bg: '#FBEBE3', text: '#B54F2C' } },
  alternant: { label: 'Alternant', swatch: { bg: '#E4F2EC', text: '#2C7A63' } },
  user: { label: 'Utilisateur', swatch: { bg: '#F1F3F6', text: '#6C7280' } },
};

export const NEUTRAL_SWATCH: Swatch = { bg: '#F1F3F6', text: '#6C7280' };

export function roleMeta(role: string) {
  return ROLE_META[role] ?? { label: role, swatch: NEUTRAL_SWATCH };
}

/** The role to surface for a user row: platform role wins, else first org role. */
export function primaryRole(u: SuperUser): string {
  if (u.role === 'super_admin' || u.role === 'support') return u.role;
  return u.memberRoles[0] ?? 'user';
}

export function initials(name?: string | null): string {
  if (!name) return '·';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Compact relative time ("il y a 2 h") for the activity feed. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `il y a ${d} j`;
  const mo = Math.round(d / 30);
  return `il y a ${mo} mois`;
}
