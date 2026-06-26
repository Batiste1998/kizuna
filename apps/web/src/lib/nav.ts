import type { Me } from './api';

/** Icon keys resolved to lucide components in the app shell (keeps this module UI-free). */
export type NavIcon =
  | 'dashboard'
  | 'competences'
  | 'journal'
  | 'bilans'
  | 'echeancier'
  | 'messagerie'
  | 'documents'
  | 'alternants'
  | 'admin'
  | 'superadmin'
  | 'support'
  | 'compte'
  | 'users'
  | 'ecoles'
  | 'settings'
  | 'associations'
  | 'membres'
  | 'entreprises'
  | 'promotions';

export interface NavItem {
  to: string;
  label: string;
  icon: NavIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const has = (me: Me, role: string) => me.memberRoles.includes(role);
const isAdmin = (me: Me) => has(me, 'admin') || has(me, 'owner');
const isTutor = (me: Me) => has(me, 'tuteur_pedagogique') || has(me, 'tuteur_entreprise');

/** Theming role used for the `data-role` accent (see styles.css). */
export function themeRoleForMe(me: Me): string {
  if (me.role === 'super_admin') return 'super_admin';
  if (me.role === 'support') return 'support';
  if (isAdmin(me)) return 'admin';
  if (has(me, 'tuteur_entreprise') && !has(me, 'tuteur_pedagogique')) return 'tuteur_entreprise';
  if (has(me, 'tuteur_pedagogique')) return 'tuteur_pedagogique';
  return 'alternant';
}

/** Short label for the navigation header (the "space" the user is in). */
export function spaceLabelForMe(me: Me): string {
  if (me.role === 'super_admin') return 'Espace super admin';
  if (me.role === 'support') return 'Espace support';
  if (isAdmin(me)) return 'Espace école';
  return 'Suivi d’alternance';
}

/** Human-readable label for the user's primary role. */
export function roleLabelForMe(me: Me): string {
  if (me.role === 'super_admin') return 'Super administrateur';
  if (me.role === 'support') return 'Support';
  if (isAdmin(me)) return 'Administrateur';
  if (has(me, 'tuteur_pedagogique')) return 'Tuteur pédagogique';
  if (has(me, 'tuteur_entreprise')) return "Tuteur d'entreprise";
  if (me.isAlternant) return 'Alternant';
  return 'Utilisateur';
}

/** Navigation sections filtered to what the user may actually access. */
export function navForMe(me: Me): NavSection[] {
  // The super admin pilots the whole platform — a dedicated navigation replaces the
  // role-suivi sections entirely.
  if (me.role === 'super_admin') {
    return [
      {
        title: 'Pilotage',
        items: [
          { to: '/app/superadmin', label: 'Tableau de bord', icon: 'dashboard' },
          { to: '/app/users', label: 'Utilisateurs', icon: 'users' },
          { to: '/app/ecoles', label: 'Écoles', icon: 'ecoles' },
          { to: '/app/support', label: 'Support', icon: 'support' },
          { to: '/app/compte', label: 'Paramètres', icon: 'settings' },
        ],
      },
    ];
  }

  // School administrators get the dedicated "Espace école" navigation.
  if (isAdmin(me)) {
    return [
      {
        title: 'Espace école',
        items: [
          { to: '/app/admin', label: 'Tableau de bord', icon: 'dashboard' },
          { to: '/app/admin/alternants', label: 'Alternants', icon: 'alternants' },
          { to: '/app/admin/associations', label: 'Associations', icon: 'associations' },
          { to: '/app/admin/membres', label: 'Membres', icon: 'membres' },
          { to: '/app/admin/entreprises', label: 'Entreprises', icon: 'entreprises' },
          { to: '/app/admin/promotions', label: 'Promotions', icon: 'promotions' },
          { to: '/app/support', label: 'Support', icon: 'support' },
        ],
      },
    ];
  }

  const sections: NavSection[] = [
    { title: 'Accueil', items: [{ to: '/app', label: 'Tableau de bord', icon: 'dashboard' }] },
  ];

  if (me.isAlternant) {
    sections.push({
      title: 'Mon suivi',
      items: [
        { to: '/app/competences', label: 'Mes compétences', icon: 'competences' },
        { to: '/app/journal', label: 'Mon journal', icon: 'journal' },
        { to: '/app/bilans', label: 'Mes bilans', icon: 'bilans' },
        { to: '/app/echeancier', label: 'Échéancier', icon: 'echeancier' },
        { to: '/app/messagerie', label: 'Messagerie', icon: 'messagerie' },
        { to: '/app/documents', label: 'Mes documents', icon: 'documents' },
      ],
    });
  }

  if (isTutor(me)) {
    sections.push({
      title: 'Tutorat',
      items: [{ to: '/app/alternants', label: 'Mes alternants', icon: 'alternants' }],
    });
  }

  if (isAdmin(me)) {
    sections.push({
      title: 'Établissement',
      items: [{ to: '/app/admin', label: 'Administration', icon: 'admin' }],
    });
  }

  if (me.role === 'super_admin') {
    sections.push({
      title: 'Plateforme',
      items: [{ to: '/app/superadmin', label: 'Super admin', icon: 'superadmin' }],
    });
  }

  sections.push({
    title: 'Compte',
    items: [
      { to: '/app/support', label: 'Support', icon: 'support' },
      { to: '/app/compte', label: 'Mon compte', icon: 'compte' },
    ],
  });

  return sections;
}
