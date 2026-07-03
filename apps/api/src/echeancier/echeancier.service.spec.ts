import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EcheancierService } from './echeancier.service';
import type { DatabaseService } from '../database/database.service';
import type { AccessService } from '../access/access.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../auth/auth.types';

type QueryResult = unknown[] | (() => unknown[]);

/** Minimal Drizzle mock: each root call (select/insert/update/delete) starts a
 *  thenable chain resolving to the next queued result (defaults to []). */
function createDbMock() {
  const queue: QueryResult[] = [];
  const inserted: unknown[] = [];

  const nextResult = (): Promise<unknown[]> => {
    const entry = queue.shift() ?? [];
    try {
      return Promise.resolve(typeof entry === 'function' ? entry() : entry);
    } catch (err) {
      return Promise.reject(err);
    }
  };

  const makeChain = () => {
    const result = nextResult();
    const chain: Record<string, unknown> = {};
    for (const method of ['from', 'where', 'orderBy', 'limit', 'leftJoin', 'returning', 'set']) {
      chain[method] = vi.fn(() => chain);
    }
    chain.values = vi.fn((value: unknown) => {
      inserted.push(value);
      return chain;
    });
    chain.then = (
      onFulfilled?: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => result.then(onFulfilled, onRejected);
    chain.catch = (onRejected?: (reason: unknown) => unknown) => result.catch(onRejected);
    return chain;
  };

  const db = {
    select: vi.fn(makeChain),
    insert: vi.fn(makeChain),
    update: vi.fn(makeChain),
    delete: vi.fn(makeChain),
  };

  return {
    db,
    database: { db } as unknown as DatabaseService,
    enqueue: (...entries: QueryResult[]) => void queue.push(...entries),
    inserted,
  };
}

const user: AuthUser = {
  id: 'tuteur-1',
  email: 'tuteur@test.dev',
  name: 'Paul',
  emailVerified: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('EcheancierService', () => {
  function setup() {
    const dbMock = createDbMock();
    const access = { resolveAlternantAccess: vi.fn() };
    const notifications = { create: vi.fn().mockResolvedValue(undefined), createMany: vi.fn() };
    const service = new EcheancierService(
      dbMock.database,
      access as unknown as AccessService,
      notifications as unknown as NotificationsService,
    );
    return { service, dbMock, access, notifications };
  }

  it('list returns an empty view when the apprentice has no promotion', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue({
      profil: { id: 'profil-1', userId: 'alt-user', promotionId: null },
      canManage: true,
    });

    const view = await service.list(user, 'profil-1');

    expect(view).toEqual({
      alternantProfilId: 'profil-1',
      promotionId: null,
      canManage: true,
      echeances: [],
    });
    expect(dbMock.db.select).not.toHaveBeenCalled();
  });

  it('list returns the promotion deadlines', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue({
      profil: { id: 'profil-1', userId: 'alt-user', promotionId: 'promo-1' },
      canManage: false,
    });
    const echeance = { id: 'ech-1', title: 'Rapport', promotionId: 'promo-1' };
    dbMock.enqueue([echeance]);

    const view = await service.list(user, 'profil-1');

    expect(view).toEqual({
      alternantProfilId: 'profil-1',
      promotionId: 'promo-1',
      canManage: false,
      echeances: [echeance],
    });
  });

  it('create is reserved to managers', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue({
      profil: { id: 'profil-1', userId: 'alt-user', promotionId: 'promo-1' },
      canManage: false,
    });

    await expect(
      service.create(user, 'profil-1', { title: 'Rapport', dueDate: '2026-09-01' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dbMock.db.insert).not.toHaveBeenCalled();
  });

  it('create requires the apprentice to belong to a promotion', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue({
      profil: { id: 'profil-1', userId: 'alt-user', promotionId: null },
      canManage: true,
    });

    await expect(
      service.create(user, 'profil-1', { title: 'Rapport', dueDate: '2026-09-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dbMock.db.insert).not.toHaveBeenCalled();
  });

  it('create inserts the deadline and notifies the apprentice', async () => {
    const { service, dbMock, access, notifications } = setup();
    access.resolveAlternantAccess.mockResolvedValue({
      profil: { id: 'profil-1', userId: 'alt-user', promotionId: 'promo-1' },
      canManage: true,
    });
    const created = { id: 'ech-1', title: 'Rapport final' };
    dbMock.enqueue([created]);

    const result = await service.create(user, 'profil-1', {
      title: 'Rapport final',
      dueDate: '2026-09-01',
      description: 'Version signée',
    });

    expect(result).toBe(created);
    expect(dbMock.inserted[0]).toEqual({
      promotionId: 'promo-1',
      title: 'Rapport final',
      dueDate: new Date('2026-09-01'),
      description: 'Version signée',
      createdByUserId: user.id,
    });
    expect(notifications.create).toHaveBeenCalledWith({
      userId: 'alt-user',
      type: 'echeance',
      title: 'Nouvelle échéance',
      detail: 'Rapport final',
      href: '/app/echeancier',
    });
  });

  it('create does not notify the creator about their own deadline', async () => {
    const { service, dbMock, access, notifications } = setup();
    access.resolveAlternantAccess.mockResolvedValue({
      profil: { id: 'profil-1', userId: user.id, promotionId: 'promo-1' },
      canManage: true,
    });
    dbMock.enqueue([{ id: 'ech-1' }]);

    await service.create(user, 'profil-1', { title: 'Rapport', dueDate: '2026-09-01' });

    expect(notifications.create).not.toHaveBeenCalled();
  });
});
