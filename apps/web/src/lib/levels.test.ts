import { describe, expect, it } from 'vitest';
import type { CompetenceLevel } from './api';
import {
  BILAN_STATUS_META,
  EVALUATOR_LABELS,
  JOURNAL_STATUS_META,
  LEVEL_BY_KEY,
  LEVELS,
} from './levels';

/** Every badge pairs a background with the matching foreground token. */
const coherentBadge = /^bg-status-([a-z]+) text-status-\1-fg$/;

describe('LEVEL_BY_KEY', () => {
  it('indexes every level of the scale by its key', () => {
    expect(Object.keys(LEVEL_BY_KEY)).toHaveLength(LEVELS.length);
    for (const level of LEVELS) {
      expect(LEVEL_BY_KEY[level.key]).toBe(level);
    }
  });

  it('exposes the documented labels and shorts', () => {
    expect(LEVEL_BY_KEY.NA.label).toBe('Non acquis');
    expect(LEVEL_BY_KEY.EC.label).toBe('En cours');
    expect(LEVEL_BY_KEY.A.label).toBe('Acquis');
    expect(LEVEL_BY_KEY.M.label).toBe('Maîtrisé');
    for (const level of LEVELS) {
      expect(LEVEL_BY_KEY[level.key].short).toBe(level.key);
    }
  });

  it('returns undefined for an unknown key', () => {
    expect(LEVEL_BY_KEY['XX' as CompetenceLevel]).toBeUndefined();
  });

  it('pairs each level badge with a coherent status colour', () => {
    for (const level of LEVELS) {
      expect(level.className).toMatch(coherentBadge);
    }
  });
});

describe('JOURNAL_STATUS_META', () => {
  it('labels every journal status', () => {
    expect(JOURNAL_STATUS_META.pending.label).toBe('En attente de validation');
    expect(JOURNAL_STATUS_META.validated.label).toBe('Validé');
    expect(JOURNAL_STATUS_META.changes_requested.label).toBe('Modifications demandées');
  });

  it('uses coherent status colours (amber/green/orange)', () => {
    for (const meta of Object.values(JOURNAL_STATUS_META)) {
      expect(meta.className).toMatch(coherentBadge);
    }
    expect(JOURNAL_STATUS_META.pending.className).toContain('bg-status-amber');
    expect(JOURNAL_STATUS_META.validated.className).toContain('bg-status-green');
    expect(JOURNAL_STATUS_META.changes_requested.className).toContain('bg-status-orange');
  });
});

describe('BILAN_STATUS_META', () => {
  it('labels every bilan status', () => {
    expect(BILAN_STATUS_META.planned.label).toBe('Planifié');
    expect(BILAN_STATUS_META.done.label).toBe('Réalisé');
    expect(BILAN_STATUS_META.signed.label).toBe('Signé');
  });

  it('uses coherent status colours (blue/amber/green)', () => {
    for (const meta of Object.values(BILAN_STATUS_META)) {
      expect(meta.className).toMatch(coherentBadge);
    }
    expect(BILAN_STATUS_META.planned.className).toContain('bg-status-blue');
    expect(BILAN_STATUS_META.done.className).toContain('bg-status-amber');
    expect(BILAN_STATUS_META.signed.className).toContain('bg-status-green');
  });
});

describe('EVALUATOR_LABELS', () => {
  it('covers exactly the three voices of the trinôme', () => {
    expect(Object.keys(EVALUATOR_LABELS).sort()).toEqual(['auto', 'entreprise', 'peda']);
  });

  it('exposes the short display labels', () => {
    expect(EVALUATOR_LABELS.auto).toBe('Auto');
    expect(EVALUATOR_LABELS.peda).toBe('Tuteur péda.');
    expect(EVALUATOR_LABELS.entreprise).toBe('Tuteur entr.');
  });
});
