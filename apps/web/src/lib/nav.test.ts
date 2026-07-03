import { describe, expect, it } from 'vitest';
import type { Me } from './api';
import { navForMe, roleLabelForMe, themeRoleForMe } from './nav';

function makeMe(overrides: Partial<Me> = {}): Me {
  return {
    id: 'u1',
    email: 'u@kizuna.dev',
    name: 'Test User',
    role: 'user',
    memberRoles: [],
    isAlternant: false,
    twoFactorEnabled: false,
    ...overrides,
  };
}

const titles = (me: Me) => navForMe(me).map((s) => s.title);
const allLinks = (me: Me) => navForMe(me).flatMap((s) => s.items.map((i) => i.to));

describe('navForMe', () => {
  it('always exposes the dashboard and account sections', () => {
    const me = makeMe();
    expect(titles(me)).toContain('Accueil');
    expect(titles(me)).toContain('Compte');
    expect(allLinks(me)).toContain('/app');
    expect(allLinks(me)).toContain('/app/support');
    expect(allLinks(me)).toContain('/app/compte');
  });

  it('shows the apprentice section only to an alternant', () => {
    const alt = makeMe({ isAlternant: true, memberRoles: ['alternant'] });
    expect(titles(alt)).toContain('Mon suivi');
    expect(allLinks(alt)).toContain('/app/competences');
    expect(allLinks(alt)).toContain('/app/journal');

    expect(titles(makeMe())).not.toContain('Mon suivi');
  });

  it('shows the tutor section to tutors', () => {
    const tutor = makeMe({ memberRoles: ['tuteur_pedagogique'] });
    expect(allLinks(tutor)).toContain('/app/alternants');
    expect(allLinks(makeMe())).not.toContain('/app/alternants');
  });

  it('shows admin and platform sections to the right roles', () => {
    const admin = makeMe({ memberRoles: ['admin'] });
    expect(allLinks(admin)).toContain('/app/admin');
    expect(allLinks(admin)).not.toContain('/app/superadmin');

    const superAdmin = makeMe({ role: 'super_admin' });
    expect(allLinks(superAdmin)).toContain('/app/superadmin');
  });

  it('replaces the whole navigation with the platform sections for a super admin', () => {
    const superAdmin = makeMe({ role: 'super_admin' });
    expect(titles(superAdmin)).toEqual(['Pilotage']);
    expect(allLinks(superAdmin)).toContain('/app/users');
    expect(allLinks(superAdmin)).toContain('/app/ecoles');
    expect(allLinks(superAdmin)).toContain('/app/support');
    expect(allLinks(superAdmin)).not.toContain('/app');
  });

  it('gives support staff a dedicated ticket-centric navigation', () => {
    const support = makeMe({ role: 'support' });
    expect(titles(support)).toEqual(['Support']);
    expect(allLinks(support)).toEqual(['/app/support', '/app/compte']);
  });

  it('gives school admins the dedicated "Espace école" navigation', () => {
    const admin = makeMe({ memberRoles: ['admin'] });
    expect(titles(admin)).toEqual(['Espace école']);
    expect(allLinks(admin)).toContain('/app/admin/alternants');
    expect(allLinks(admin)).toContain('/app/admin/membres');
    expect(allLinks(admin)).toContain('/app/admin/entreprises');
    expect(allLinks(admin)).toContain('/app/admin/promotions');
    expect(allLinks(admin)).not.toContain('/app');
  });

  it('treats an owner like an admin', () => {
    const owner = makeMe({ memberRoles: ['owner'] });
    expect(titles(owner)).toEqual(['Espace école']);
    expect(allLinks(owner)).toContain('/app/admin');
  });

  it('shows the tutor section to a company tutor too', () => {
    const tutor = makeMe({ memberRoles: ['tuteur_entreprise'] });
    expect(titles(tutor)).toContain('Tutorat');
    expect(allLinks(tutor)).toContain('/app/alternants');
  });

  it('keeps a member without any role on the minimal navigation', () => {
    const plain = makeMe();
    expect(titles(plain)).toEqual(['Accueil', 'Compte']);
    expect(allLinks(plain)).not.toContain('/app/alternants');
    expect(allLinks(plain)).not.toContain('/app/admin');
    expect(allLinks(plain)).not.toContain('/app/superadmin');
  });
});

describe('themeRoleForMe', () => {
  it('derives the accent role with the documented precedence', () => {
    expect(themeRoleForMe(makeMe({ role: 'super_admin' }))).toBe('super_admin');
    expect(themeRoleForMe(makeMe({ role: 'support' }))).toBe('support');
    expect(themeRoleForMe(makeMe({ memberRoles: ['admin'] }))).toBe('admin');
    expect(themeRoleForMe(makeMe({ memberRoles: ['tuteur_entreprise'] }))).toBe(
      'tuteur_entreprise',
    );
    expect(themeRoleForMe(makeMe({ memberRoles: ['tuteur_pedagogique'] }))).toBe(
      'tuteur_pedagogique',
    );
    expect(themeRoleForMe(makeMe({ isAlternant: true }))).toBe('alternant');
  });

  it('prioritises platform roles over establishment roles', () => {
    const both = makeMe({ role: 'super_admin', memberRoles: ['admin'] });
    expect(themeRoleForMe(both)).toBe('super_admin');
  });

  it('picks the pedagogic accent when the user holds both tutor roles', () => {
    const both = makeMe({ memberRoles: ['tuteur_entreprise', 'tuteur_pedagogique'] });
    expect(themeRoleForMe(both)).toBe('tuteur_pedagogique');
  });

  it('treats an owner like an admin and falls back to alternant', () => {
    expect(themeRoleForMe(makeMe({ memberRoles: ['owner'] }))).toBe('admin');
    expect(themeRoleForMe(makeMe())).toBe('alternant');
  });
});

describe('roleLabelForMe', () => {
  it('returns a human label for the primary role', () => {
    expect(roleLabelForMe(makeMe({ role: 'super_admin' }))).toBe('Super administrateur');
    expect(roleLabelForMe(makeMe({ memberRoles: ['admin'] }))).toBe('Administrateur');
    expect(roleLabelForMe(makeMe({ isAlternant: true, memberRoles: ['alternant'] }))).toBe(
      'Alternant',
    );
  });

  it('labels every remaining role', () => {
    expect(roleLabelForMe(makeMe({ role: 'support' }))).toBe('Support');
    expect(roleLabelForMe(makeMe({ memberRoles: ['owner'] }))).toBe('Administrateur');
    expect(roleLabelForMe(makeMe({ memberRoles: ['tuteur_pedagogique'] }))).toBe(
      'Tuteur pédagogique',
    );
    expect(roleLabelForMe(makeMe({ memberRoles: ['tuteur_entreprise'] }))).toBe(
      "Tuteur d'entreprise",
    );
  });

  it('prefers the pedagogic tutor label when both tutor roles are held', () => {
    const both = makeMe({ memberRoles: ['tuteur_entreprise', 'tuteur_pedagogique'] });
    expect(roleLabelForMe(both)).toBe('Tuteur pédagogique');
  });

  it('falls back to a generic label for a member without any role', () => {
    expect(roleLabelForMe(makeMe())).toBe('Utilisateur');
  });
});
