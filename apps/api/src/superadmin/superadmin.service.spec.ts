import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SuperAdminService } from './superadmin.service';
import type { DatabaseService } from '../database/database.service';
import type { Auth } from '../auth/auth';
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
  id: 'sa-1',
  email: 'root@example.com',
  name: 'Root',
  emailVerified: true,
  role: 'super_admin',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('SuperAdminService', () => {
  let db: ReturnType<typeof createDbMock>;
  let auth: { api: { signUpEmail: ReturnType<typeof vi.fn> } };
  let service: SuperAdminService;

  beforeEach(() => {
    db = createDbMock();
    auth = { api: { signUpEmail: vi.fn() } };
    service = new SuperAdminService(db.database, auth as unknown as Auth);
  });

  describe('access guard (ensure)', () => {
    it('rejects overview for a non super_admin', async () => {
      await expect(service.overview(authUser({ role: 'support' }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(db.calls).toHaveLength(0);
    });

    it('rejects listOrganizations for a regular user', async () => {
      await expect(service.listOrganizations(authUser({ role: 'user' }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejects establishment type management for a non super_admin', async () => {
      await expect(service.listEstablishmentTypes(authUser({ role: null }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.createEstablishmentType(authUser({ role: 'support' }), 'CFA'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('overview', () => {
    it('aggregates platform counts', async () => {
      db.enqueue(
        [{ id: 'org-1' }, { id: 'org-2' }],
        [
          { id: 'u1', banned: false },
          { id: 'u2', banned: true },
          { id: 'u3', banned: null },
        ],
        [{ id: 'alt-1' }],
        [
          { id: 't1', status: 'open' },
          { id: 't2', status: 'in_progress' },
          { id: 't3', status: 'resolved' },
        ],
        [
          { userId: 'u1', role: 'admin' },
          { userId: 'u1', role: 'owner' },
          { userId: 'u2', role: 'owner' },
          { userId: 'u3', role: 'alternant' },
        ],
      );

      const overview = await service.overview(authUser());

      expect(overview.counts).toEqual({
        organizations: 2,
        users: 3,
        alternants: 1,
        openTickets: 2, // resolved excluded
        admins: 2, // u1 deduplicated across admin+owner
        pending: 1, // banned users
      });
    });
  });

  describe('listOrganizations', () => {
    it('returns organizations with member, admin and alternant counts', async () => {
      db.enqueue(
        [
          { id: 'org-1', name: 'École A', type: 'CFA', city: 'Lyon', createdAt: new Date() },
          { id: 'org-2', name: 'École B', type: null, city: null, createdAt: new Date() },
        ],
        [
          { organizationId: 'org-1', role: 'admin' },
          { organizationId: 'org-1', role: 'owner' },
          { organizationId: 'org-1', role: 'alternant' },
          { organizationId: 'org-2', role: 'tuteur_pedagogique' },
        ],
        [{ organizationId: 'org-1' }, { organizationId: 'org-1' }],
      );

      const orgs = await service.listOrganizations(authUser());

      expect(orgs).toHaveLength(2);
      expect(orgs[0]).toMatchObject({
        id: 'org-1',
        name: 'École A',
        memberCount: 3,
        adminCount: 2,
        alternantCount: 2,
      });
      expect(orgs[1]).toMatchObject({
        id: 'org-2',
        memberCount: 1,
        adminCount: 0,
        alternantCount: 0,
      });
    });
  });

  describe('createOrganization', () => {
    it('slugifies accents and spaces in the name', async () => {
      db.enqueue([
        { id: 'org-1', name: 'École Été 2026', type: 'CFA', city: 'Lyon', createdAt: new Date() },
      ]);

      const created = await service.createOrganization(authUser(), {
        name: 'École Été 2026',
        type: 'CFA',
        city: 'Lyon',
      });

      const values = db.calls.find((c) => c.method === 'values')?.args[0] as { slug: string };
      expect(values.slug).toMatch(/^ecole-ete-2026-[0-9a-f]{6}$/);
      expect(created).toMatchObject({
        id: 'org-1',
        memberCount: 0,
        adminCount: 0,
        alternantCount: 0,
      });
    });

    it('falls back to "ecole" when the name has no usable characters', async () => {
      db.enqueue([{ id: 'org-1', name: '!!!', type: null, city: null, createdAt: new Date() }]);

      await service.createOrganization(authUser(), { name: '!!!' });

      const values = db.calls.find((c) => c.method === 'values')?.args[0] as { slug: string };
      expect(values.slug).toMatch(/^ecole-[0-9a-f]{6}$/);
    });

    it('generates a unique slug for the same name', async () => {
      db.enqueue(
        [{ id: 'org-1', createdAt: new Date() }],
        [{ id: 'org-2', createdAt: new Date() }],
      );

      await service.createOrganization(authUser(), { name: 'Mon École' });
      await service.createOrganization(authUser(), { name: 'Mon École' });

      const slugs = db.calls
        .filter((c) => c.method === 'values')
        .map((c) => (c.args[0] as { slug: string }).slug);
      expect(slugs).toHaveLength(2);
      expect(slugs[0]).not.toBe(slugs[1]);
      for (const slug of slugs) expect(slug).toMatch(/^mon-ecole-[0-9a-f]{6}$/);
    });

    it('defaults type and city to null', async () => {
      db.enqueue([{ id: 'org-1', createdAt: new Date() }]);

      await service.createOrganization(authUser(), { name: 'Simple' });

      const values = db.calls.find((c) => c.method === 'values')?.args[0] as Record<
        string,
        unknown
      >;
      expect(values.type).toBeNull();
      expect(values.city).toBeNull();
    });
  });

  describe('updateOrganization', () => {
    it('throws when the organization does not exist', async () => {
      db.enqueue([]);

      await expect(
        service.updateOrganization(authUser(), 'org-x', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.calls.filter((c) => c.method === 'update')).toHaveLength(0);
    });

    it('only patches the provided fields', async () => {
      db.enqueue([{ id: 'org-1' }]);

      const result = await service.updateOrganization(authUser(), 'org-1', { city: 'Paris' });

      expect(result).toEqual({ id: 'org-1' });
      const patch = db.calls.find((c) => c.method === 'set')?.args[0];
      expect(patch).toEqual({ city: 'Paris' });
    });

    it('allows clearing type and city with null', async () => {
      db.enqueue([{ id: 'org-1' }]);

      await service.updateOrganization(authUser(), 'org-1', { type: null, city: null });

      const patch = db.calls.find((c) => c.method === 'set')?.args[0];
      expect(patch).toEqual({ type: null, city: null });
    });
  });

  describe('establishment types', () => {
    it('rejects a blank label', async () => {
      await expect(service.createEstablishmentType(authUser(), '   ')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(db.calls.filter((c) => c.method === 'insert')).toHaveLength(0);
    });

    it('returns the existing type instead of duplicating it', async () => {
      const existing = { id: 'type-1', label: 'CFA' };
      db.enqueue([existing]);

      const result = await service.createEstablishmentType(authUser(), '  CFA  ');

      expect(result).toBe(existing);
      expect(db.calls.filter((c) => c.method === 'insert')).toHaveLength(0);
    });

    it('trims the label and creates the type', async () => {
      const created = { id: 'type-1', label: 'Lycée pro' };
      db.enqueue([], [created]); // lookup miss, then insert returning

      const result = await service.createEstablishmentType(authUser(), '  Lycée pro  ');

      expect(result).toBe(created);
      const values = db.calls.find((c) => c.method === 'values')?.args[0] as { label: string };
      expect(values.label).toBe('Lycée pro');
    });

    it('deletes a type by id', async () => {
      await expect(service.deleteEstablishmentType(authUser(), 'type-1')).resolves.toEqual({
        id: 'type-1',
      });
      expect(db.calls.some((c) => c.method === 'delete')).toBe(true);
    });
  });
});
