import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SuperUser } from './api';
import {
  NEUTRAL_SWATCH,
  ROLE_META,
  formatDate,
  initials,
  primaryRole,
  roleMeta,
  timeAgo,
} from './super';

function user(partial: Partial<SuperUser>): SuperUser {
  return {
    id: 'u-1',
    name: 'Test',
    email: 'test@ex.fr',
    role: 'user',
    banned: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    orgCount: 0,
    memberRoles: [],
    organizations: [],
    ...partial,
  };
}

describe('roleMeta', () => {
  it('returns the design-system meta for known roles', () => {
    expect(roleMeta('alternant')).toBe(ROLE_META.alternant);
    expect(roleMeta('super_admin').label).toBe('Super admin');
  });

  it('falls back to a neutral swatch with the raw role as label', () => {
    expect(roleMeta('inconnu')).toEqual({ label: 'inconnu', swatch: NEUTRAL_SWATCH });
  });
});

describe('primaryRole', () => {
  it('lets the platform role win', () => {
    expect(primaryRole(user({ role: 'super_admin', memberRoles: ['alternant'] }))).toBe(
      'super_admin',
    );
    expect(primaryRole(user({ role: 'support' }))).toBe('support');
  });

  it('surfaces owners and admins as "admin"', () => {
    expect(primaryRole(user({ memberRoles: ['owner'] }))).toBe('admin');
    expect(primaryRole(user({ memberRoles: ['tuteur_pedagogique', 'admin'] }))).toBe('admin');
  });

  it('falls back to the first member role, then "user"', () => {
    expect(primaryRole(user({ memberRoles: ['tuteur_entreprise'] }))).toBe('tuteur_entreprise');
    expect(primaryRole(user({ memberRoles: [] }))).toBe('user');
  });
});

describe('initials', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(initials('Marie Dupont')).toBe('MD');
    expect(initials('jean claude van damme')).toBe('JC');
    expect(initials('Solo')).toBe('S');
  });

  it('returns a placeholder without a name', () => {
    expect(initials(null)).toBe('·');
    expect(initials('')).toBe('·');
  });
});

describe('formatDate', () => {
  it('formats an ISO date in French', () => {
    const label = formatDate('2026-01-15T10:00:00.000Z');
    expect(label).toContain('2026');
    expect(label).toContain('janv');
  });
});

describe('timeAgo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('scales from minutes to months', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-03T12:00:00.000Z'));

    expect(timeAgo('2026-07-03T11:59:45.000Z')).toBe("à l'instant");
    expect(timeAgo('2026-07-03T11:45:00.000Z')).toBe('il y a 15 min');
    expect(timeAgo('2026-07-03T09:00:00.000Z')).toBe('il y a 3 h');
    expect(timeAgo('2026-07-01T12:00:00.000Z')).toBe('il y a 2 j');
    expect(timeAgo('2026-05-03T12:00:00.000Z')).toBe('il y a 2 mois');
  });
});
