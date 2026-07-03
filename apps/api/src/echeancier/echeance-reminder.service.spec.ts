import { Logger } from '@nestjs/common';
import { EcheanceReminderService } from './echeance-reminder.service';
import type { DatabaseService } from '../database/database.service';
import type { NotificationsService } from '../notifications/notifications.service';

type QueryResult = unknown[] | (() => unknown[]);

/** Minimal Drizzle mock: each root call (select/insert/update/delete) starts a
 *  thenable chain resolving to the next queued result (defaults to []). */
function createDbMock() {
  const queue: QueryResult[] = [];
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
    for (const method of ['from', 'where', 'orderBy', 'limit', 'leftJoin', 'returning', 'values']) {
      chain[method] = vi.fn(() => chain);
    }
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
    updated,
  };
}

const HOUR = 60 * 60 * 1000;

function makeEcheance(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ech-1',
    promotionId: 'promo-1',
    title: 'Rapport final',
    description: 'Version signée attendue',
    dueDate: new Date(Date.now() + 60 * HOUR),
    reminderSentAt: null,
    ...overrides,
  };
}

describe('EcheanceReminderService', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setup() {
    const dbMock = createDbMock();
    const notifications = { create: vi.fn(), createMany: vi.fn().mockResolvedValue(undefined) };
    const service = new EcheanceReminderService(
      dbMock.database,
      notifications as unknown as NotificationsService,
    );
    return { service, dbMock, notifications };
  }

  it('does nothing when no échéance falls inside the reminder window', async () => {
    const { service, dbMock, notifications } = setup();
    dbMock.enqueue([]);

    await service.remindUpcoming();

    expect(notifications.createMany).not.toHaveBeenCalled();
    expect(dbMock.db.update).not.toHaveBeenCalled();
  });

  it('notifies every apprentice of the promotion and marks the reminder sent', async () => {
    const { service, dbMock, notifications } = setup();
    const echeance = makeEcheance();
    dbMock.enqueue([echeance], [{ userId: 'alt-1' }, { userId: 'alt-2' }]);

    await service.remindUpcoming();

    expect(notifications.createMany).toHaveBeenCalledTimes(1);
    const inputs = notifications.createMany.mock.calls[0][0] as {
      userId: string;
      type: string;
      detail: string | null;
      href: string;
    }[];
    expect(inputs.map((i) => i.userId)).toEqual(['alt-1', 'alt-2']);
    expect(inputs[0]).toMatchObject({
      type: 'echeance',
      detail: 'Version signée attendue',
      href: '/app/echeancier',
    });
    expect(dbMock.db.update).toHaveBeenCalledTimes(1);
    expect(dbMock.updated[0]).toMatchObject({ reminderSentAt: expect.any(Date) });
  });

  it('says "demain" when the deadline is within a day', async () => {
    const { service, dbMock, notifications } = setup();
    dbMock.enqueue(
      [makeEcheance({ dueDate: new Date(Date.now() + 12 * HOUR) })],
      [{ userId: 'alt-1' }],
    );

    await service.remindUpcoming();

    const inputs = notifications.createMany.mock.calls[0][0] as { title: string }[];
    expect(inputs[0].title).toBe('Échéance demain : Rapport final');
  });

  it('counts remaining days when the deadline is further away', async () => {
    const { service, dbMock, notifications } = setup();
    dbMock.enqueue(
      [makeEcheance({ dueDate: new Date(Date.now() + 60 * HOUR) })],
      [{ userId: 'alt-1' }],
    );

    await service.remindUpcoming();

    const inputs = notifications.createMany.mock.calls[0][0] as { title: string }[];
    expect(inputs[0].title).toBe('Échéance dans 3 jours : Rapport final');
  });

  it('processes each upcoming échéance independently', async () => {
    const { service, dbMock, notifications } = setup();
    dbMock.enqueue(
      [makeEcheance({ id: 'ech-1' }), makeEcheance({ id: 'ech-2', promotionId: 'promo-2' })],
      [{ userId: 'alt-1' }], // profils of promo-1
      [], // update ech-1
      [{ userId: 'alt-9' }], // profils of promo-2
      [], // update ech-2
    );

    await service.remindUpcoming();

    expect(notifications.createMany).toHaveBeenCalledTimes(2);
    expect(dbMock.db.update).toHaveBeenCalledTimes(2);
    const second = notifications.createMany.mock.calls[1][0] as { userId: string }[];
    expect(second.map((i) => i.userId)).toEqual(['alt-9']);
  });
});
