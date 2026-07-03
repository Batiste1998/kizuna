import type { ConfigService } from '@nestjs/config';
import { NotificationsService, type NotificationInput } from './notifications.service';
import type { DatabaseService } from '../database/database.service';
import type { MailService } from '../mail/mail.service';
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

/** Waits for the fire-and-forget email mirroring to settle. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

const user: AuthUser = {
  id: 'user-1',
  email: 'user@test.dev',
  name: 'Alice',
  emailVerified: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('NotificationsService', () => {
  function setup() {
    const dbMock = createDbMock();
    const config = { get: vi.fn(() => 'https://kizuna.test') };
    const mail = { sendMail: vi.fn().mockResolvedValue(undefined) };
    const service = new NotificationsService(
      dbMock.database,
      config as unknown as ConfigService,
      mail as unknown as MailService,
    );
    return { service, dbMock, config, mail };
  }

  it('create inserts the notification row', async () => {
    const { service, dbMock } = setup();

    await service.create({ userId: 'u1', type: 'message', title: 'Nouveau message' });
    await flush();

    expect(dbMock.inserted[0]).toEqual({
      userId: 'u1',
      type: 'message',
      title: 'Nouveau message',
      detail: null,
      href: null,
    });
  });

  it('create does not email conversational types', async () => {
    const { service, dbMock, mail } = setup();

    await service.create({ userId: 'u1', type: 'journal', title: 'Entrée validée' });
    await flush();

    expect(dbMock.db.select).not.toHaveBeenCalled();
    expect(mail.sendMail).not.toHaveBeenCalled();
  });

  it('create mirrors emailed types to the recipient inbox with a CTA link', async () => {
    const { service, dbMock, mail } = setup();
    dbMock.enqueue([], [{ id: 'u1', email: 'u1@test.dev' }]);

    await service.create({
      userId: 'u1',
      type: 'bilan',
      title: 'Bilan planifié',
      detail: 'Le 12 mars',
      href: '/app/bilans',
    });
    await flush();

    expect(mail.sendMail).toHaveBeenCalledTimes(1);
    const message = mail.sendMail.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(message.to).toBe('u1@test.dev');
    expect(message.subject).toBe('Kizuna — Bilan planifié');
    expect(message.html).toContain('https://kizuna.test/app/bilans');
    expect(message.text).toContain('Le 12 mars');
  });

  it('create swallows insert failures', async () => {
    const { service, dbMock } = setup();
    dbMock.enqueue(() => {
      throw new Error('db down');
    });

    await expect(
      service.create({ userId: 'u1', type: 'message', title: 'Ping' }),
    ).resolves.toBeUndefined();
    await flush();
  });

  it('createMany skips entirely when every recipient is empty', async () => {
    const { service, dbMock, mail } = setup();

    await service.createMany([{ userId: '', type: 'echeance', title: 'Rappel' }]);
    await flush();

    expect(dbMock.db.insert).not.toHaveBeenCalled();
    expect(mail.sendMail).not.toHaveBeenCalled();
  });

  it('createMany filters out empty recipients before inserting', async () => {
    const { service, dbMock } = setup();
    const inputs: NotificationInput[] = [
      { userId: 'u1', type: 'message', title: 'Ping' },
      { userId: '', type: 'message', title: 'Ping' },
      { userId: 'u2', type: 'message', title: 'Ping', detail: 'coucou' },
    ];

    await service.createMany(inputs);
    await flush();

    expect(dbMock.inserted[0]).toEqual([
      { userId: 'u1', type: 'message', title: 'Ping', detail: null, href: null },
      { userId: 'u2', type: 'message', title: 'Ping', detail: 'coucou', href: null },
    ]);
  });

  it('createMany resolves duplicated recipients through a single user lookup', async () => {
    const { service, dbMock, mail } = setup();
    dbMock.enqueue([], [{ id: 'u1', email: 'u1@test.dev' }]);

    await service.createMany([
      { userId: 'u1', type: 'echeance', title: 'Rappel 1' },
      { userId: 'u1', type: 'echeance', title: 'Rappel 2' },
    ]);
    await flush();

    expect(dbMock.db.select).toHaveBeenCalledTimes(1);
    expect(mail.sendMail).toHaveBeenCalledTimes(2);
    const targets = mail.sendMail.mock.calls.map((c) => (c[0] as { to: string }).to);
    expect(targets).toEqual(['u1@test.dev', 'u1@test.dev']);
  });

  it('list returns the latest notifications with the unread count', async () => {
    const { service, dbMock } = setup();
    const n1 = { id: 'n1', userId: user.id, read: false };
    const n2 = { id: 'n2', userId: user.id, read: true };
    dbMock.enqueue([n1, n2], [{ id: 'n1' }]);

    const result = await service.list(user);

    expect(result.notifications).toEqual([n1, n2]);
    expect(result.unreadCount).toBe(1);
  });

  it('markRead flags a single notification of the user', async () => {
    const { service, dbMock } = setup();

    await expect(service.markRead(user, 'n1')).resolves.toEqual({ ok: true });

    expect(dbMock.db.update).toHaveBeenCalledTimes(1);
    expect(dbMock.updated[0]).toEqual({ read: true });
  });

  it('markAllRead flags everything for the user', async () => {
    const { service, dbMock } = setup();

    await expect(service.markAllRead(user)).resolves.toEqual({ ok: true });

    expect(dbMock.db.update).toHaveBeenCalledTimes(1);
    expect(dbMock.updated[0]).toEqual({ read: true });
  });
});
