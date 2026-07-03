import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CompetencesService } from './competences.service';
import type { DatabaseService } from '../database/database.service';
import type { AccessService, AlternantAccess } from '../access/access.service';
import type { AuthUser } from '../auth/auth.types';

interface DbCall {
  method: string;
  args: unknown[];
}

const CHAIN_METHODS = [
  'from',
  'where',
  'orderBy',
  'limit',
  'leftJoin',
  'values',
  'onConflictDoUpdate',
  'returning',
  'set',
] as const;

/**
 * Local mock of the Drizzle query builder: every chained method returns the
 * chain itself, and the chain is a thenable that resolves the next queued
 * result (one entry per awaited query, in execution order).
 */
function createDbMock() {
  const queue: unknown[][] = [];
  const calls: DbCall[] = [];

  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    for (const method of CHAIN_METHODS) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ method, args });
        return chain;
      };
    }
    chain.then = (
      onFulfilled: (rows: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(queue.shift() ?? []).then(onFulfilled, onRejected);
    return chain;
  };

  const start =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return makeChain();
    };

  const database = {
    db: {
      select: start('select'),
      insert: start('insert'),
      update: start('update'),
      delete: start('delete'),
    },
  } as unknown as DatabaseService;

  return { database, calls, enqueue: (...results: unknown[][]) => queue.push(...results) };
}

const authUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'user-1',
  email: 'user@example.com',
  name: 'User One',
  emailVerified: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const accessResult = (overrides: Partial<AlternantAccess> = {}): AlternantAccess =>
  ({
    profil: {
      id: 'alt-1',
      userId: 'alt-user',
      organizationId: 'org-1',
      promotionId: 'promo-1',
    },
    association: null,
    relation: 'alternant',
    editableAs: 'auto',
    canManage: false,
    ...overrides,
  }) as AlternantAccess;

describe('CompetencesService', () => {
  let db: ReturnType<typeof createDbMock>;
  let access: {
    resolveAlternantAccess: ReturnType<typeof vi.fn>;
    getMyAlternantProfileId: ReturnType<typeof vi.fn>;
  };
  let service: CompetencesService;

  beforeEach(() => {
    db = createDbMock();
    access = { resolveAlternantAccess: vi.fn(), getMyAlternantProfileId: vi.fn() };
    service = new CompetencesService(db.database, access as unknown as AccessService);
  });

  describe('getAlternantCompetences', () => {
    it('returns an empty view when the profile has no promotion', async () => {
      access.resolveAlternantAccess.mockResolvedValue(
        accessResult({
          profil: { id: 'alt-1', userId: 'alt-user', organizationId: 'org-1', promotionId: null },
        } as Partial<AlternantAccess>),
      );

      const view = await service.getAlternantCompetences(authUser(), 'alt-1');

      expect(view).toEqual({
        alternantProfilId: 'alt-1',
        referentiel: null,
        editableAs: 'auto',
        blocs: [],
      });
      expect(db.calls.filter((c) => c.method === 'select')).toHaveLength(0);
    });

    it('returns an empty view when the promotion has no referentiel', async () => {
      access.resolveAlternantAccess.mockResolvedValue(accessResult());
      db.enqueue([{ id: 'promo-1', referentielId: null }]);

      const view = await service.getAlternantCompetences(authUser(), 'alt-1');

      expect(view.referentiel).toBeNull();
      expect(view.blocs).toEqual([]);
      expect(db.calls.filter((c) => c.method === 'select')).toHaveLength(1);
    });

    it('maps blocs, competences and evaluations by evaluator voice', async () => {
      access.resolveAlternantAccess.mockResolvedValue(accessResult({ editableAs: 'peda' }));
      db.enqueue(
        [{ id: 'promo-1', referentielId: 'ref-1' }],
        [{ id: 'ref-1', code: 'RNCP1', title: 'Dev web' }],
        [
          { id: 'b1', code: 'B1', label: 'Bloc 1', position: 1 },
          { id: 'b2', code: 'B2', label: 'Bloc 2', position: 2 },
        ],
        [
          { id: 'c1', blocId: 'b1', code: 'C1.1', label: 'Comp 1' },
          { id: 'c2', blocId: 'b1', code: 'C1.2', label: 'Comp 2' },
          { id: 'c3', blocId: 'b2', code: 'C2.1', label: 'Comp 3' },
        ],
        [
          { competenceId: 'c1', evaluator: 'auto', level: 'A' },
          { competenceId: 'c1', evaluator: 'peda', level: 'EC' },
          { competenceId: 'c3', evaluator: 'entreprise', level: 'M' },
        ],
      );

      const view = await service.getAlternantCompetences(authUser(), 'alt-1');

      expect(view.referentiel).toEqual({ id: 'ref-1', code: 'RNCP1', title: 'Dev web' });
      expect(view.editableAs).toBe('peda');
      expect(view.blocs).toHaveLength(2);
      expect(view.blocs[0].competences.map((c) => c.id)).toEqual(['c1', 'c2']);
      expect(view.blocs[1].competences.map((c) => c.id)).toEqual(['c3']);
      expect(view.blocs[0].competences[0].evaluations).toEqual({ auto: 'A', peda: 'EC' });
      expect(view.blocs[0].competences[1].evaluations).toEqual({});
      expect(view.blocs[1].competences[0].evaluations).toEqual({ entreprise: 'M' });
    });

    it('skips the competence query when the referentiel has no blocs', async () => {
      access.resolveAlternantAccess.mockResolvedValue(accessResult());
      db.enqueue(
        [{ id: 'promo-1', referentielId: 'ref-1' }],
        [{ id: 'ref-1', code: 'RNCP1', title: 'Dev web' }],
        [], // no blocs
        [], // evaluations
      );

      const view = await service.getAlternantCompetences(authUser(), 'alt-1');

      expect(view.blocs).toEqual([]);
      // promotion + referentiel + blocs + evaluations, but no competence select
      expect(db.calls.filter((c) => c.method === 'select')).toHaveLength(4);
    });
  });

  describe('setEvaluation', () => {
    it('rejects when the user has no editable voice', async () => {
      access.resolveAlternantAccess.mockResolvedValue(accessResult({ editableAs: null }));

      await expect(service.setEvaluation(authUser(), 'alt-1', 'c1', 'A')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(db.calls.filter((c) => c.method === 'insert')).toHaveLength(0);
    });

    it('rejects when the competence is outside the apprentice referentiel', async () => {
      access.resolveAlternantAccess.mockResolvedValue(
        accessResult({
          profil: { id: 'alt-1', userId: 'alt-user', organizationId: 'org-1', promotionId: null },
        } as Partial<AlternantAccess>),
      );

      await expect(
        service.setEvaluation(authUser(), 'alt-1', 'c-unknown', 'A'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.calls.filter((c) => c.method === 'insert')).toHaveLength(0);
    });

    it('upserts the evaluation with the resolved evaluator role', async () => {
      access.resolveAlternantAccess.mockResolvedValue(accessResult({ editableAs: 'entreprise' }));
      db.enqueue(
        [{ id: 'promo-1', referentielId: 'ref-1' }],
        [{ id: 'ref-1', code: 'RNCP1', title: 'Dev web' }],
        [{ id: 'b1', code: 'B1', label: 'Bloc 1', position: 1 }],
        [{ id: 'c1', blocId: 'b1', code: 'C1.1', label: 'Comp 1' }],
        [], // evaluations
      );

      const result = await service.setEvaluation(authUser(), 'alt-1', 'c1', 'M');

      expect(result).toEqual({ competenceId: 'c1', evaluator: 'entreprise', level: 'M' });
      const values = db.calls.find((c) => c.method === 'values');
      expect(values?.args[0]).toEqual({
        alternantProfilId: 'alt-1',
        competenceId: 'c1',
        evaluator: 'entreprise',
        level: 'M',
      });
      expect(db.calls.some((c) => c.method === 'onConflictDoUpdate')).toBe(true);
    });

    it('never writes with a voice other than the one granted by access', async () => {
      // Apprentice evaluating themselves: only the "auto" voice may be written.
      access.resolveAlternantAccess.mockResolvedValue(accessResult({ editableAs: 'auto' }));
      db.enqueue(
        [{ id: 'promo-1', referentielId: 'ref-1' }],
        [{ id: 'ref-1', code: 'RNCP1', title: 'Dev web' }],
        [{ id: 'b1', code: 'B1', label: 'Bloc 1', position: 1 }],
        [{ id: 'c1', blocId: 'b1', code: 'C1.1', label: 'Comp 1' }],
        [],
      );

      const result = await service.setEvaluation(authUser(), 'alt-1', 'c1', 'EC');

      expect(result.evaluator).toBe('auto');
      const values = db.calls.find((c) => c.method === 'values');
      expect((values?.args[0] as { evaluator: string }).evaluator).toBe('auto');
    });
  });

  it('delegates getMyAlternantProfileId to the access service', async () => {
    access.getMyAlternantProfileId.mockResolvedValue('alt-42');
    const user = authUser();

    await expect(service.getMyAlternantProfileId(user)).resolves.toBe('alt-42');
    expect(access.getMyAlternantProfileId).toHaveBeenCalledWith(user);
  });
});
