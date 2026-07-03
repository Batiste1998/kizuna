import { describe, expect, it } from 'vitest';
import {
  DEMO_PERSONAS,
  isDemoAccount,
  ROLES,
  STAFF_PERSONAS,
  SUBJECT_PERSONA,
  TRINOME_PERSONAS,
} from './roles';

describe('isDemoAccount', () => {
  it('recognises seeded @kizuna.dev accounts', () => {
    expect(isDemoAccount('alternant@kizuna.dev')).toBe(true);
    expect(isDemoAccount('support@kizuna.dev')).toBe(true);
  });

  it('rejects every other domain', () => {
    expect(isDemoAccount('lea@gmail.com')).toBe(false);
    expect(isDemoAccount('admin@kizuna.fr')).toBe(false);
    expect(isDemoAccount('x@notkizuna.dev')).toBe(false);
  });

  it('handles missing or empty emails', () => {
    expect(isDemoAccount(undefined)).toBe(false);
    expect(isDemoAccount(null)).toBe(false);
    expect(isDemoAccount('')).toBe(false);
  });
});

describe('DEMO_PERSONAS', () => {
  it('describes the six demo accounts with a complete structure', () => {
    expect(DEMO_PERSONAS).toHaveLength(6);
    for (const persona of DEMO_PERSONAS) {
      expect(persona.email).toMatch(/@kizuna\.dev$/);
      expect(isDemoAccount(persona.email)).toBe(true);
      expect(persona.name.length).toBeGreaterThan(0);
      expect(persona.firstName.length).toBeGreaterThan(0);
      expect(persona.persona.length).toBeGreaterThan(0);
      expect(['trinome', 'plateforme']).toContain(persona.group);
    }
  });

  it('uses a unique email and a unique role per persona', () => {
    const emails = DEMO_PERSONAS.map((p) => p.email);
    expect(new Set(emails).size).toBe(DEMO_PERSONAS.length);
    const keys = DEMO_PERSONAS.map((p) => p.key);
    expect(new Set(keys).size).toBe(DEMO_PERSONAS.length);
  });

  it('only references roles that exist in the design system', () => {
    const validKeys = ROLES.map((r) => r.key);
    for (const persona of DEMO_PERSONAS) {
      expect(validKeys).toContain(persona.key);
    }
  });
});

describe('TRINOME_PERSONAS', () => {
  it('binds exactly the three roles of the trinôme', () => {
    expect(TRINOME_PERSONAS.map((p) => p.key).sort()).toEqual([
      'alternant',
      'tuteur_entreprise',
      'tuteur_pedagogique',
    ]);
    for (const persona of TRINOME_PERSONAS) {
      expect(persona.group).toBe('trinome');
    }
  });
});

describe('STAFF_PERSONAS', () => {
  it('lists platform staff without the super admin', () => {
    expect(STAFF_PERSONAS.map((p) => p.key).sort()).toEqual(['admin', 'support']);
    for (const persona of STAFF_PERSONAS) {
      expect(persona.group).toBe('plateforme');
      expect(persona.key).not.toBe('super_admin');
    }
  });
});

describe('SUBJECT_PERSONA', () => {
  it('is the apprentice the trinôme follows', () => {
    expect(SUBJECT_PERSONA?.key).toBe('alternant');
    expect(SUBJECT_PERSONA?.group).toBe('trinome');
  });
});
