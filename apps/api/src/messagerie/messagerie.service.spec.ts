import { ForbiddenException } from '@nestjs/common';
import { MessagerieService } from './messagerie.service';
import type { DatabaseService } from '../database/database.service';
import type { AccessService, AlternantAccess } from '../access/access.service';
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

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'alt-user',
    email: 'user@test.dev',
    name: 'Alice',
    emailVerified: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeAccess(overrides: Partial<AlternantAccess> = {}): AlternantAccess {
  return {
    profil: { id: 'profil-1', userId: 'alt-user' },
    association: { tuteurPedaUserId: 'peda-user', tuteurEntrepriseUserId: 'ent-user' },
    relation: 'alternant',
    editableAs: 'auto',
    canManage: false,
    ...overrides,
  } as AlternantAccess;
}

describe('MessagerieService', () => {
  function setup() {
    const dbMock = createDbMock();
    const access = { resolveAlternantAccess: vi.fn() };
    const notifications = { create: vi.fn(), createMany: vi.fn().mockResolvedValue(undefined) };
    const service = new MessagerieService(
      dbMock.database,
      access as unknown as AccessService,
      notifications as unknown as NotificationsService,
    );
    return { service, dbMock, access, notifications };
  }

  const row = (id: string, authorUserId: string) => ({
    id,
    body: `msg-${id}`,
    createdAt: new Date('2026-03-01'),
    authorUserId,
    authorName: 'Someone',
  });

  it('list maps each author to its trinôme relation', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue(makeAccess());
    dbMock.enqueue([
      row('m1', 'alt-user'),
      row('m2', 'peda-user'),
      row('m3', 'ent-user'),
      row('m4', 'someone-else'),
    ]);

    const view = await service.list(makeUser(), 'profil-1');

    expect(view.messages.map((m) => m.authorRelation)).toEqual([
      'alternant',
      'peda',
      'entreprise',
      'other',
    ]);
    expect(view.canPost).toBe(true);
  });

  it('list maps tutors to "other" when there is no association', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue(makeAccess({ association: null }));
    dbMock.enqueue([row('m1', 'peda-user'), row('m2', 'alt-user')]);

    const view = await service.list(makeUser(), 'profil-1');

    expect(view.messages.map((m) => m.authorRelation)).toEqual(['other', 'alternant']);
  });

  it('list denies posting to read-only viewers', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue(
      makeAccess({ relation: 'platform', editableAs: null }),
    );
    dbMock.enqueue([]);

    const view = await service.list(makeUser({ id: 'admin-user' }), 'profil-1');

    expect(view.canPost).toBe(false);
    expect(view.messages).toEqual([]);
  });

  it('send rejects users outside the trinôme', async () => {
    const { service, dbMock, access, notifications } = setup();
    access.resolveAlternantAccess.mockResolvedValue(makeAccess({ editableAs: null }));

    await expect(
      service.send(makeUser({ id: 'stranger' }), 'profil-1', 'Hello'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dbMock.db.insert).not.toHaveBeenCalled();
    expect(notifications.createMany).not.toHaveBeenCalled();
  });

  it('send inserts the message and returns the author view', async () => {
    const { service, dbMock, access } = setup();
    const user = makeUser();
    access.resolveAlternantAccess.mockResolvedValue(makeAccess());
    dbMock.enqueue([{ id: 'm1', body: 'Hello', createdAt: new Date('2026-03-02') }]);

    const message = await service.send(user, 'profil-1', 'Hello');

    expect(dbMock.inserted[0]).toEqual({
      alternantProfilId: 'profil-1',
      authorUserId: 'alt-user',
      body: 'Hello',
    });
    expect(message).toMatchObject({
      id: 'm1',
      body: 'Hello',
      authorUserId: 'alt-user',
      authorName: 'Alice',
      authorRelation: 'alternant',
    });
  });

  it('send notifies the other trinôme members but never the sender', async () => {
    const { service, dbMock, access, notifications } = setup();
    access.resolveAlternantAccess.mockResolvedValue(makeAccess());
    dbMock.enqueue([{ id: 'm1', body: 'Hello', createdAt: new Date('2026-03-02') }]);

    await service.send(makeUser(), 'profil-1', 'Hello');

    const recipients = notifications.createMany.mock.calls[0][0] as {
      userId: string;
      href: string;
    }[];
    expect(recipients.map((r) => r.userId)).toEqual(['peda-user', 'ent-user']);
    expect(recipients.every((r) => r.href === '/app/alternants/profil-1/messagerie')).toBe(true);
    expect(recipients[0]).toMatchObject({ type: 'message', title: 'Nouveau message de Alice' });
  });

  it('send from a tutor notifies the apprentice on their own messagerie route', async () => {
    const { service, dbMock, access, notifications } = setup();
    const peda = makeUser({ id: 'peda-user', name: 'Paul' });
    access.resolveAlternantAccess.mockResolvedValue(
      makeAccess({ relation: 'peda', editableAs: 'peda' }),
    );
    dbMock.enqueue([{ id: 'm2', body: 'Bonjour', createdAt: new Date('2026-03-02') }]);

    const message = await service.send(peda, 'profil-1', 'Bonjour');

    const recipients = notifications.createMany.mock.calls[0][0] as {
      userId: string;
      href: string;
    }[];
    expect(recipients.map((r) => r.userId)).toEqual(['alt-user', 'ent-user']);
    expect(recipients[0].href).toBe('/app/messagerie');
    expect(message.authorRelation).toBe('peda');
  });

  it('send skips missing tutors and truncates the notification detail', async () => {
    const { service, dbMock, access, notifications } = setup();
    const peda = makeUser({ id: 'peda-user', name: 'Paul' });
    access.resolveAlternantAccess.mockResolvedValue(
      makeAccess({
        association: {
          tuteurPedaUserId: 'peda-user',
          tuteurEntrepriseUserId: null,
        } as AlternantAccess['association'],
        editableAs: 'peda',
      }),
    );
    const longBody = 'x'.repeat(200);
    dbMock.enqueue([{ id: 'm3', body: longBody, createdAt: new Date('2026-03-02') }]);

    await service.send(peda, 'profil-1', longBody);

    const recipients = notifications.createMany.mock.calls[0][0] as {
      userId: string;
      detail: string;
    }[];
    expect(recipients).toHaveLength(1);
    expect(recipients[0].userId).toBe('alt-user');
    expect(recipients[0].detail).toBe('x'.repeat(120));
  });
});
