import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BilansService } from './bilans.service';
import { renderBilanPdf } from './bilan-pdf';
import type { DatabaseService } from '../database/database.service';
import type { AccessService, AlternantAccess } from '../access/access.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { AiService } from '../ai/ai.service';
import type { AuthUser } from '../auth/auth.types';

vi.mock('./bilan-pdf', () => ({
  renderBilanPdf: vi.fn(() => 'pdf-stream'),
}));

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
  'innerJoin',
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
    relation: 'peda',
    editableAs: 'peda',
    canManage: true,
    ...overrides,
  }) as AlternantAccess;

describe('BilansService', () => {
  let db: ReturnType<typeof createDbMock>;
  let access: { resolveAlternantAccess: ReturnType<typeof vi.fn> };
  let notifications: { create: ReturnType<typeof vi.fn> };
  let ai: { complete: ReturnType<typeof vi.fn> };
  let service: BilansService;

  beforeEach(() => {
    vi.mocked(renderBilanPdf).mockClear();
    db = createDbMock();
    access = { resolveAlternantAccess: vi.fn() };
    notifications = { create: vi.fn().mockResolvedValue(undefined) };
    ai = { complete: vi.fn().mockResolvedValue('Brouillon de synthèse.') };
    service = new BilansService(
      db.database,
      access as unknown as AccessService,
      notifications as unknown as NotificationsService,
      ai as unknown as AiService,
    );
  });

  describe('list', () => {
    it('returns the bilans with the canManage flag', async () => {
      access.resolveAlternantAccess.mockResolvedValue(accessResult({ canManage: false }));
      const rows = [{ id: 'bilan-1', label: 'Bilan S1' }];
      db.enqueue(rows);

      const view = await service.list(authUser(), 'alt-1');

      expect(view).toEqual({ alternantProfilId: 'alt-1', canManage: false, bilans: rows });
      expect(db.calls.some((c) => c.method === 'orderBy')).toBe(true);
    });
  });

  describe('create', () => {
    it('rejects when the user cannot manage the apprentice', async () => {
      access.resolveAlternantAccess.mockResolvedValue(accessResult({ canManage: false }));

      await expect(
        service.create(authUser(), 'alt-1', { label: 'Bilan S1', scheduledAt: '2026-09-01' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.calls.filter((c) => c.method === 'insert')).toHaveLength(0);
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('inserts the bilan and notifies the apprentice', async () => {
      access.resolveAlternantAccess.mockResolvedValue(accessResult());
      const created = { id: 'bilan-1', label: 'Bilan S1' };
      db.enqueue([created]);

      const result = await service.create(authUser(), 'alt-1', {
        label: 'Bilan S1',
        scheduledAt: '2026-09-01T10:00:00.000Z',
      });

      expect(result).toBe(created);
      const values = db.calls.find((c) => c.method === 'values');
      expect(values?.args[0]).toMatchObject({
        alternantProfilId: 'alt-1',
        label: 'Bilan S1',
        createdByUserId: 'user-1',
      });
      expect((values?.args[0] as { scheduledAt: Date }).scheduledAt).toEqual(
        new Date('2026-09-01T10:00:00.000Z'),
      );
      expect(notifications.create).toHaveBeenCalledWith({
        userId: 'alt-user',
        type: 'bilan',
        title: 'Bilan planifié',
        detail: 'Bilan S1',
        href: '/app/bilans',
      });
    });

    it('does not notify when the creator is the apprentice themself', async () => {
      access.resolveAlternantAccess.mockResolvedValue(
        accessResult({
          profil: { id: 'alt-1', userId: 'user-1', organizationId: 'org-1', promotionId: null },
        } as Partial<AlternantAccess>),
      );
      db.enqueue([{ id: 'bilan-1' }]);

      await service.create(authUser({ id: 'user-1' }), 'alt-1', {
        label: 'Bilan S1',
        scheduledAt: '2026-09-01',
      });

      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws when the bilan does not exist', async () => {
      db.enqueue([]);

      await expect(service.update(authUser(), 'bilan-x', { label: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects when the user cannot manage the apprentice', async () => {
      db.enqueue([{ id: 'bilan-1', alternantProfilId: 'alt-1' }]);
      access.resolveAlternantAccess.mockResolvedValue(accessResult({ canManage: false }));

      await expect(
        service.update(authUser(), 'bilan-1', { status: 'done' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.calls.filter((c) => c.method === 'update')).toHaveLength(0);
    });

    it('only patches the provided fields', async () => {
      db.enqueue([{ id: 'bilan-1', alternantProfilId: 'alt-1' }]);
      access.resolveAlternantAccess.mockResolvedValue(accessResult());
      const updated = { id: 'bilan-1', status: 'done' };
      db.enqueue([updated]);

      const result = await service.update(authUser(), 'bilan-1', { status: 'done' });

      expect(result).toBe(updated);
      const patch = db.calls.find((c) => c.method === 'set')?.args[0] as Record<string, unknown>;
      expect(patch.status).toBe('done');
      expect(patch.updatedAt).toBeInstanceOf(Date);
      expect(patch).not.toHaveProperty('label');
      expect(patch).not.toHaveProperty('scheduledAt');
      expect(patch).not.toHaveProperty('summary');
    });

    it('converts scheduledAt to a Date and patches all fields', async () => {
      db.enqueue([{ id: 'bilan-1', alternantProfilId: 'alt-1' }]);
      access.resolveAlternantAccess.mockResolvedValue(accessResult());
      db.enqueue([{ id: 'bilan-1' }]);

      await service.update(authUser(), 'bilan-1', {
        status: 'signed',
        label: 'Bilan final',
        scheduledAt: '2026-10-01T09:00:00.000Z',
        summary: 'Tout va bien',
      });

      const patch = db.calls.find((c) => c.method === 'set')?.args[0] as Record<string, unknown>;
      expect(patch).toMatchObject({
        status: 'signed',
        label: 'Bilan final',
        summary: 'Tout va bien',
      });
      expect(patch.scheduledAt).toEqual(new Date('2026-10-01T09:00:00.000Z'));
    });
  });

  describe('generateVisio', () => {
    it('throws when the bilan does not exist', async () => {
      db.enqueue([]);

      await expect(service.generateVisio(authUser(), 'bilan-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects when the user cannot manage the apprentice', async () => {
      db.enqueue([{ id: 'bilan-1', alternantProfilId: 'alt-1', visioUrl: null }]);
      access.resolveAlternantAccess.mockResolvedValue(accessResult({ canManage: false }));

      await expect(service.generateVisio(authUser(), 'bilan-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('is idempotent: an existing link is returned untouched', async () => {
      const existing = {
        id: 'bilan-1',
        alternantProfilId: 'alt-1',
        visioUrl: 'https://meet.jit.si/kizuna-bilan-deja-la',
      };
      db.enqueue([existing]);
      access.resolveAlternantAccess.mockResolvedValue(accessResult());

      const result = await service.generateVisio(authUser(), 'bilan-1');

      expect(result).toBe(existing);
      expect(db.calls.filter((c) => c.method === 'update')).toHaveLength(0);
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('generates an unguessable Jitsi room and notifies the apprentice', async () => {
      db.enqueue([{ id: 'bilan-1', alternantProfilId: 'alt-1', label: 'Bilan S1', visioUrl: null }]);
      access.resolveAlternantAccess.mockResolvedValue(accessResult());
      const updated = { id: 'bilan-1', visioUrl: 'https://meet.jit.si/kizuna-bilan-x' };
      db.enqueue([updated]);

      const result = await service.generateVisio(authUser(), 'bilan-1');

      expect(result).toBe(updated);
      const patch = db.calls.find((c) => c.method === 'set')?.args[0] as { visioUrl: string };
      expect(patch.visioUrl).toMatch(/^https:\/\/meet\.jit\.si\/kizuna-bilan-[0-9a-f-]{36}$/);
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'alt-user',
          type: 'bilan',
          title: 'Lien visio ajouté au bilan',
          detail: expect.stringContaining('Bilan S1'),
        }),
      );
    });

    it('does not notify when the generator is the apprentice themself', async () => {
      db.enqueue([{ id: 'bilan-1', alternantProfilId: 'alt-1', label: 'Bilan S1', visioUrl: null }]);
      access.resolveAlternantAccess.mockResolvedValue(
        accessResult({
          profil: { id: 'alt-1', userId: 'user-1', organizationId: 'org-1', promotionId: null },
        } as Partial<AlternantAccess>),
      );
      db.enqueue([{ id: 'bilan-1' }]);

      await service.generateVisio(authUser({ id: 'user-1' }), 'bilan-1');

      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('draftSummary', () => {
    it('throws when the bilan does not exist', async () => {
      db.enqueue([]);

      await expect(service.draftSummary(authUser(), 'bilan-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects when the user cannot manage the apprentice', async () => {
      db.enqueue([{ id: 'bilan-1', alternantProfilId: 'alt-1' }]);
      access.resolveAlternantAccess.mockResolvedValue(accessResult({ canManage: false }));

      await expect(service.draftSummary(authUser(), 'bilan-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(ai.complete).not.toHaveBeenCalled();
    });

    it('grounds the prompt in the three-voice evaluations and the validated journal', async () => {
      db.enqueue([
        {
          id: 'bilan-1',
          alternantProfilId: 'alt-1',
          label: 'Bilan S1',
          scheduledAt: new Date('2026-09-01T10:00:00.000Z'),
        },
      ]);
      access.resolveAlternantAccess.mockResolvedValue(accessResult());
      db.enqueue([{ name: 'Léa Martin' }]); // alternant
      db.enqueue([
        { competenceLabel: 'Modéliser les données', blocCode: 'BC01', evaluator: 'peda', level: 'A' },
        { competenceLabel: 'Déployer en production', blocCode: 'BC03', evaluator: 'auto', level: 'EC' },
      ]);
      db.enqueue([{ title: 'Sprint 1', content: 'Mise en place du CI' }]);

      const result = await service.draftSummary(authUser(), 'bilan-1');

      expect(result).toEqual({ draft: 'Brouillon de synthèse.' });
      const [system, prompt] = ai.complete.mock.calls[0] as [string, string];
      expect(system).toContain('bilan tripartite');
      expect(prompt).toContain('Léa Martin');
      expect(prompt).toContain('[BC01] Modéliser les données — tuteur pédagogique : acquis');
      expect(prompt).toContain('[BC03] Déployer en production — auto-évaluation : en cours');
      expect(prompt).toContain('Sprint 1 : Mise en place du CI');
    });

    it('signals empty data instead of inventing facts', async () => {
      db.enqueue([
        {
          id: 'bilan-1',
          alternantProfilId: 'alt-1',
          label: 'Bilan S1',
          scheduledAt: new Date('2026-09-01'),
        },
      ]);
      access.resolveAlternantAccess.mockResolvedValue(accessResult());
      db.enqueue([{ name: 'Léa Martin' }], [], []);

      await service.draftSummary(authUser(), 'bilan-1');

      const prompt = ai.complete.mock.calls[0][1] as string;
      expect(prompt).toContain('(aucune évaluation)');
      expect(prompt).toContain('(journal vide)');
    });
  });

  describe('exportPdf', () => {
    it('throws when the bilan does not exist', async () => {
      db.enqueue([]);

      await expect(service.exportPdf(authUser(), 'bilan-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(renderBilanPdf).not.toHaveBeenCalled();
    });

    it('assembles the trinôme context and calls the renderer', async () => {
      const bilan = {
        id: 'bilan-1',
        alternantProfilId: 'alt-1',
        label: 'Bilan S1',
        scheduledAt: new Date('2026-09-01'),
        status: 'planned',
        summary: 'RAS',
      };
      access.resolveAlternantAccess.mockResolvedValue(
        accessResult({
          profil: {
            id: 'alt-1',
            userId: 'alt-user',
            organizationId: 'org-1',
            promotionId: 'promo-1',
          },
          association: {
            tuteurPedaUserId: 'peda-user',
            tuteurEntrepriseUserId: 'ent-user',
            entrepriseId: 'ent-1',
          },
        } as Partial<AlternantAccess>),
      );
      db.enqueue(
        [bilan],
        [
          { id: 'alt-user', name: 'Alice Alternante' },
          { id: 'peda-user', name: 'Paul Péda' },
          { id: 'ent-user', name: 'Erika Entreprise' },
        ],
        [{ name: 'École Kizuna' }],
        [{ name: 'Promo 2026' }],
        [{ name: 'ACME Corp' }],
      );

      const result = await service.exportPdf(authUser(), 'bilan-1');

      expect(result).toEqual({ pdf: 'pdf-stream', label: 'Bilan S1' });
      expect(renderBilanPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationName: 'École Kizuna',
          bilanLabel: 'Bilan S1',
          status: 'planned',
          summary: 'RAS',
          alternantName: 'Alice Alternante',
          promotionName: 'Promo 2026',
          entrepriseName: 'ACME Corp',
          tuteurPedaName: 'Paul Péda',
          tuteurEntrepriseName: 'Erika Entreprise',
        }),
      );
    });

    it('falls back to null names when there is no association or promotion', async () => {
      const bilan = {
        id: 'bilan-1',
        alternantProfilId: 'alt-1',
        label: 'Bilan S1',
        scheduledAt: new Date('2026-09-01'),
        status: 'planned',
        summary: null,
      };
      access.resolveAlternantAccess.mockResolvedValue(
        accessResult({
          profil: { id: 'alt-1', userId: 'alt-user', organizationId: 'org-1', promotionId: null },
          association: null,
        } as Partial<AlternantAccess>),
      );
      db.enqueue([bilan], [], []); // bilan, users, organization

      await service.exportPdf(authUser(), 'bilan-1');

      expect(renderBilanPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationName: '',
          alternantName: '—',
          promotionName: null,
          entrepriseName: null,
          tuteurPedaName: null,
          tuteurEntrepriseName: null,
        }),
      );
      // No promotion or entreprise queries: bilan + users + organization only.
      expect(db.calls.filter((c) => c.method === 'select')).toHaveLength(3);
    });
  });
});
