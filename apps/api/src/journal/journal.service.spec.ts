import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JournalService } from './journal.service';
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
  const updated: unknown[] = [];

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
    for (const method of ['from', 'where', 'orderBy', 'limit', 'leftJoin', 'returning']) {
      chain[method] = vi.fn(() => chain);
    }
    chain.values = vi.fn((value: unknown) => {
      inserted.push(value);
      return chain;
    });
    chain.set = vi.fn((value: unknown) => {
      updated.push(value);
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
    updated,
  };
}

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    email: 'user@test.dev',
    name: 'Test User',
    emailVerified: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('JournalService', () => {
  const user = makeUser();

  function setup() {
    const dbMock = createDbMock();
    const access = { resolveAlternantAccess: vi.fn() };
    const notifications = { create: vi.fn().mockResolvedValue(undefined), createMany: vi.fn() };
    const service = new JournalService(
      dbMock.database,
      access as unknown as AccessService,
      notifications as unknown as NotificationsService,
    );
    return { service, dbMock, access, notifications };
  }

  it('list returns the entries with the caller evaluator role', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue({ editableAs: 'peda' });
    const entry = {
      id: 'e1',
      title: 'Semaine 1',
      content: 'Contenu',
      status: 'pending',
      reviewComment: null,
      reviewedAt: null,
      createdAt: new Date('2026-02-01'),
      authorName: 'Alice',
    };
    dbMock.enqueue([entry]);

    const view = await service.list(user, 'profil-1');

    expect(access.resolveAlternantAccess).toHaveBeenCalledWith(user, 'profil-1');
    expect(view).toEqual({ alternantProfilId: 'profil-1', editableAs: 'peda', entries: [entry] });
  });

  it('create rejects anyone who is not the apprentice', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue({ editableAs: 'entreprise' });

    await expect(
      service.create(user, 'profil-1', { title: 'T', content: 'C' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dbMock.db.insert).not.toHaveBeenCalled();
  });

  it('create inserts the entry and returns it with the author name', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue({ editableAs: 'auto' });
    const created = {
      id: 'e1',
      title: 'Semaine 1',
      content: 'Contenu',
      status: 'pending',
      reviewComment: null,
      reviewedAt: null,
      createdAt: new Date('2026-02-01'),
    };
    dbMock.enqueue([created]);

    const result = await service.create(user, 'profil-1', {
      title: 'Semaine 1',
      content: 'Contenu',
    });

    expect(dbMock.inserted[0]).toEqual({
      alternantProfilId: 'profil-1',
      authorUserId: user.id,
      title: 'Semaine 1',
      content: 'Contenu',
    });
    expect(result).toEqual({ ...created, authorName: user.name });
  });

  it('review throws NotFound when the entry does not exist', async () => {
    const { service, dbMock, access } = setup();
    dbMock.enqueue([]);

    await expect(service.review(user, 'missing', { status: 'validated' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(access.resolveAlternantAccess).not.toHaveBeenCalled();
  });

  it('review is reserved to the company tutor', async () => {
    const { service, dbMock, access, notifications } = setup();
    dbMock.enqueue([{ id: 'e1', alternantProfilId: 'profil-1', authorUserId: 'alt', title: 'T' }]);
    access.resolveAlternantAccess.mockResolvedValue({ editableAs: 'auto' });

    await expect(service.review(user, 'e1', { status: 'validated' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(dbMock.db.update).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('review validates the entry and notifies its author', async () => {
    const { service, dbMock, access, notifications } = setup();
    dbMock.enqueue([
      { id: 'e1', alternantProfilId: 'profil-1', authorUserId: 'alt-user', title: 'Semaine 1' },
    ]);
    access.resolveAlternantAccess.mockResolvedValue({ editableAs: 'entreprise' });

    const result = await service.review(user, 'e1', { status: 'validated' });

    expect(result).toEqual({ id: 'e1', status: 'validated' });
    expect(dbMock.updated[0]).toMatchObject({
      status: 'validated',
      reviewComment: null,
      reviewerUserId: user.id,
    });
    expect(notifications.create).toHaveBeenCalledWith({
      userId: 'alt-user',
      type: 'journal',
      title: 'Entrée de journal validée',
      detail: 'Semaine 1',
      href: '/app/journal',
    });
  });

  it('review stores the comment when changes are requested', async () => {
    const { service, dbMock, access, notifications } = setup();
    dbMock.enqueue([
      { id: 'e1', alternantProfilId: 'profil-1', authorUserId: 'alt-user', title: 'Semaine 1' },
    ]);
    access.resolveAlternantAccess.mockResolvedValue({ editableAs: 'entreprise' });

    const result = await service.review(user, 'e1', {
      status: 'changes_requested',
      comment: 'Détaille la partie technique',
    });

    expect(result.status).toBe('changes_requested');
    expect(dbMock.updated[0]).toMatchObject({
      status: 'changes_requested',
      reviewComment: 'Détaille la partie technique',
    });
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Modifications demandées' }),
    );
  });
});
