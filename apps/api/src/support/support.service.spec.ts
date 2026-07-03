import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupportService } from './support.service';
import type { DatabaseService } from '../database/database.service';
import type { NotificationsService } from '../notifications/notifications.service';
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
  role: 'user',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const ticketRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'ticket-1',
  number: 1,
  subject: 'Bug affichage',
  type: 'bug',
  priority: 'moyenne',
  status: 'open',
  requesterUserId: 'user-1',
  assigneeUserId: null,
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-02'),
  ...overrides,
});

describe('SupportService', () => {
  let db: ReturnType<typeof createDbMock>;
  let notifications: { create: ReturnType<typeof vi.fn> };
  let service: SupportService;

  beforeEach(() => {
    db = createDbMock();
    notifications = { create: vi.fn().mockResolvedValue(undefined) };
    service = new SupportService(db.database, notifications as unknown as NotificationsService);
  });

  describe('list', () => {
    it('returns every ticket, unfiltered, for a support user', async () => {
      db.enqueue(
        [ticketRow(), ticketRow({ id: 'ticket-2', number: 2, requesterUserId: 'someone-else' })],
        [{ id: 'user-1', name: 'Alice' }],
      );

      const view = await service.list(authUser({ id: 'sup-1', role: 'support' }));

      expect(view.canTriage).toBe(true);
      expect(view.tickets).toHaveLength(2);
      // Only the withNames lookup filters; the ticket query itself has no where.
      expect(db.calls.filter((c) => c.method === 'where')).toHaveLength(1);
    });

    it('only returns the requester own tickets for a regular user', async () => {
      db.enqueue([ticketRow()], [{ id: 'user-1', name: 'Alice' }]);

      const view = await service.list(authUser());

      expect(view.canTriage).toBe(false);
      expect(view.tickets).toHaveLength(1);
      // Ticket query filtered by requester + withNames lookup.
      expect(db.calls.filter((c) => c.method === 'where')).toHaveLength(2);
    });

    it('formats the reference with zero padding', async () => {
      db.enqueue(
        [ticketRow({ number: 7 }), ticketRow({ id: 'ticket-2', number: 12345 })],
        [{ id: 'user-1', name: 'Alice' }],
      );

      const view = await service.list(authUser({ role: 'super_admin' }));

      expect(view.tickets.map((t) => t.ref)).toEqual(['KZ-0007', 'KZ-12345']);
    });

    it('resolves requester and assignee names', async () => {
      db.enqueue(
        [ticketRow({ assigneeUserId: 'sup-1' })],
        [
          { id: 'user-1', name: 'Alice' },
          { id: 'sup-1', name: 'Sam Support' },
        ],
      );

      const view = await service.list(authUser());

      expect(view.tickets[0].requesterName).toBe('Alice');
      expect(view.tickets[0].assigneeName).toBe('Sam Support');
    });
  });

  describe('create', () => {
    it('creates the ticket with a default priority and a first message', async () => {
      const created = ticketRow();
      db.enqueue([created], [], [{ id: 'user-1', name: 'Alice' }]);

      const summary = await service.create(authUser(), {
        subject: 'Bug affichage',
        type: 'bug',
        description: 'Le graphique ne se charge pas',
      });

      expect(summary.ref).toBe('KZ-0001');
      const values = db.calls.filter((c) => c.method === 'values');
      expect(values[0].args[0]).toEqual({
        subject: 'Bug affichage',
        type: 'bug',
        priority: 'moyenne',
        requesterUserId: 'user-1',
      });
      expect(values[1].args[0]).toEqual({
        ticketId: 'ticket-1',
        authorUserId: 'user-1',
        body: 'Le graphique ne se charge pas',
      });
    });

    it('honors an explicit priority', async () => {
      db.enqueue([ticketRow({ priority: 'haute' })], [], [{ id: 'user-1', name: 'Alice' }]);

      await service.create(authUser(), {
        subject: 'Urgent',
        type: 'demande',
        priority: 'haute',
        description: 'Vite',
      });

      const values = db.calls.find((c) => c.method === 'values')?.args[0] as { priority: string };
      expect(values.priority).toBe('haute');
    });
  });

  describe('detail', () => {
    it('throws when the ticket does not exist', async () => {
      db.enqueue([]);

      await expect(service.detail(authUser(), 'ticket-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects a user who is neither support nor the requester', async () => {
      db.enqueue([ticketRow({ requesterUserId: 'someone-else' })]);

      await expect(service.detail(authUser(), 'ticket-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('flags messages authored by support roles', async () => {
      db.enqueue(
        [ticketRow()],
        [
          {
            id: 'm1',
            body: 'Bonjour',
            createdAt: new Date('2026-06-01'),
            authorName: 'Alice',
            authorRole: 'user',
          },
          {
            id: 'm2',
            body: 'On regarde',
            createdAt: new Date('2026-06-02'),
            authorName: 'Sam Support',
            authorRole: 'support',
          },
        ],
        [{ id: 'user-1', name: 'Alice' }],
      );

      const view = await service.detail(authUser(), 'ticket-1');

      expect(view.canTriage).toBe(false);
      expect(view.messages.map((m) => m.authorIsSupport)).toEqual([false, true]);
      expect(view.ticket.ref).toBe('KZ-0001');
    });
  });

  describe('reply', () => {
    it('self-assigns, moves the ticket to in_progress and notifies the requester on a support reply', async () => {
      const support = authUser({ id: 'sup-1', name: 'Sam Support', role: 'support' });
      db.enqueue(
        [ticketRow({ status: 'open', assigneeUserId: null })],
        [{ id: 'm1', body: 'On regarde', createdAt: new Date('2026-06-03') }],
        [], // ticket update
      );

      const message = await service.reply(support, 'ticket-1', 'On regarde');

      expect(message).toMatchObject({
        id: 'm1',
        body: 'On regarde',
        authorName: 'Sam Support',
        authorIsSupport: true,
      });
      const patch = db.calls.find((c) => c.method === 'set')?.args[0] as Record<string, unknown>;
      expect(patch.status).toBe('in_progress');
      expect(patch.assigneeUserId).toBe('sup-1');
      expect(patch.updatedAt).toBeInstanceOf(Date);
      expect(notifications.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'ticket',
        title: 'Réponse au ticket KZ-0001',
        detail: 'On regarde',
        href: '/app/support/ticket-1',
      });
    });

    it('keeps the existing assignee and status on a support reply to an in_progress ticket', async () => {
      const support = authUser({ id: 'sup-2', role: 'super_admin' });
      db.enqueue(
        [ticketRow({ status: 'in_progress', assigneeUserId: 'sup-1' })],
        [{ id: 'm1', body: 'Suite', createdAt: new Date() }],
        [],
      );

      await service.reply(support, 'ticket-1', 'Suite');

      const patch = db.calls.find((c) => c.method === 'set')?.args[0] as Record<string, unknown>;
      expect(patch).not.toHaveProperty('status');
      expect(patch).not.toHaveProperty('assigneeUserId');
    });

    it('notifies the assignee when the requester replies', async () => {
      db.enqueue(
        [ticketRow({ status: 'in_progress', assigneeUserId: 'sup-1' })],
        [{ id: 'm1', body: 'Merci', createdAt: new Date() }],
        [],
      );

      const message = await service.reply(authUser(), 'ticket-1', 'Merci');

      expect(message.authorIsSupport).toBe(false);
      const patch = db.calls.find((c) => c.method === 'set')?.args[0] as Record<string, unknown>;
      expect(patch).not.toHaveProperty('status');
      expect(patch).not.toHaveProperty('assigneeUserId');
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'sup-1', type: 'ticket' }),
      );
    });

    it('sends no notification when the ticket has no assignee yet', async () => {
      db.enqueue([ticketRow()], [{ id: 'm1', body: 'Up', createdAt: new Date() }], []);

      await service.reply(authUser(), 'ticket-1', 'Up');

      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('is reserved to support roles', async () => {
      await expect(
        service.update(authUser(), 'ticket-1', { status: 'resolved' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.calls).toHaveLength(0);
    });

    it('throws when the ticket does not exist', async () => {
      db.enqueue([]);

      await expect(
        service.update(authUser({ role: 'support' }), 'ticket-x', { status: 'resolved' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('closes and reassigns the ticket in one patch', async () => {
      const support = authUser({ id: 'sup-1', role: 'support' });
      const updated = ticketRow({ status: 'resolved', assigneeUserId: 'sup-1' });
      db.enqueue([ticketRow()], [updated], [{ id: 'user-1', name: 'Alice' }]);

      const summary = await service.update(support, 'ticket-1', {
        status: 'resolved',
        assignToMe: true,
      });

      expect(summary.status).toBe('resolved');
      const patch = db.calls.find((c) => c.method === 'set')?.args[0] as Record<string, unknown>;
      expect(patch.status).toBe('resolved');
      expect(patch.assigneeUserId).toBe('sup-1');
    });

    it('reopens a resolved ticket via a status-only patch', async () => {
      const support = authUser({ id: 'sup-1', role: 'support' });
      const updated = ticketRow({ status: 'open' });
      db.enqueue([ticketRow({ status: 'resolved' })], [updated], [{ id: 'user-1', name: 'Alice' }]);

      const summary = await service.update(support, 'ticket-1', { status: 'open' });

      expect(summary.status).toBe('open');
      const patch = db.calls.find((c) => c.method === 'set')?.args[0] as Record<string, unknown>;
      expect(patch.status).toBe('open');
      expect(patch).not.toHaveProperty('assigneeUserId');
    });
  });
});
