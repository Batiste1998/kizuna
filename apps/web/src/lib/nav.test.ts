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
});

describe('themeRoleForMe', () => {
  it('derives the accent role with the documented precedence', () => {
    expect(themeRoleForMe(makeMe({ role: 'super_admin' }))).toBe('super_admin');
    expect(themeRoleForMe(makeMe({ role: 'support' }))).toBe('support');
    expect(themeRoleForMe(makeMe({ memberRoles: ['admin'] }))).toBe('admin');
    expect(themeRoleForMe(makeMe({ memberRoles: ['tuteur_entreprise'] }))).toBe('tuteur_entreprise');
    expect(themeRoleForMe(makeMe({ memberRoles: ['tuteur_pedagogique'] }))).toBe(
      'tuteur_pedagogique',
    );
    expect(themeRoleForMe(makeMe({ isAlternant: true }))).toBe('alternant');
  });

  it('prioritises platform roles over establishment roles', () => {
    const both = makeMe({ role: 'super_admin', memberRoles: ['admin'] });
    expect(themeRoleForMe(both)).toBe('super_admin');
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
});
