import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { DocumentsService } from './documents.service';
import type { DatabaseService } from '../database/database.service';
import type { AccessService } from '../access/access.service';
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
  id: 'user-1',
  email: 'user@test.dev',
  name: 'Alice',
  emailVerified: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// Points inside the scratch area: nothing exists there, so safeUnlink/existsSync
// take the "missing file" path without touching the real filesystem.
const uploadDirValue = 'var/uploads-spec-nonexistent';

const file = {
  originalname: 'convention.pdf',
  filename: 'stored-key.pdf',
  mimetype: 'application/pdf',
  size: 1234,
} as Express.Multer.File;

describe('DocumentsService', () => {
  function setup() {
    const dbMock = createDbMock();
    const access = { resolveAlternantAccess: vi.fn() };
    const config = { getOrThrow: vi.fn(() => uploadDirValue) };
    const service = new DocumentsService(
      dbMock.database,
      access as unknown as AccessService,
      config as unknown as ConfigService,
    );
    return { service, dbMock, access };
  }

  it('list allows uploads for trinôme and admin relations', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue({ relation: 'peda' });
    const doc = { id: 'd1', originalName: 'convention.pdf' };
    dbMock.enqueue([doc]);

    const view = await service.list(user, 'profil-1');

    expect(view).toEqual({ alternantProfilId: 'profil-1', canUpload: true, documents: [doc] });
  });

  it('list keeps platform viewers read-only', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue({ relation: 'platform' });
    dbMock.enqueue([]);

    const view = await service.list(user, 'profil-1');

    expect(view.canUpload).toBe(false);
  });

  it('record rejects platform users without inserting', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue({ relation: 'platform' });

    await expect(service.record(user, 'profil-1', file, 'convention')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(dbMock.db.insert).not.toHaveBeenCalled();
  });

  it('record stores a valid category as-is', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue({ relation: 'alternant' });
    const created = { id: 'd1', category: 'convention' };
    dbMock.enqueue([created]);

    const result = await service.record(user, 'profil-1', file, 'convention');

    expect(dbMock.inserted[0]).toEqual({
      alternantProfilId: 'profil-1',
      uploadedByUserId: user.id,
      category: 'convention',
      originalName: 'convention.pdf',
      storageKey: 'stored-key.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1234,
    });
    expect(result).toBe(created);
  });

  it('record falls back to "autre" for an unknown category', async () => {
    const { service, dbMock, access } = setup();
    access.resolveAlternantAccess.mockResolvedValue({ relation: 'entreprise' });
    dbMock.enqueue([{ id: 'd2', category: 'autre' }]);

    await service.record(user, 'profil-1', file, 'nimporte-quoi');

    expect(dbMock.inserted[0]).toMatchObject({ category: 'autre' });
  });

  it('getForDownload throws NotFound for an unknown document', async () => {
    const { service, dbMock, access } = setup();
    dbMock.enqueue([]);

    await expect(service.getForDownload(user, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(access.resolveAlternantAccess).not.toHaveBeenCalled();
  });

  it('getForDownload throws NotFound when the file is gone from disk', async () => {
    const { service, dbMock, access } = setup();
    dbMock.enqueue([{ id: 'd1', alternantProfilId: 'profil-1', storageKey: 'gone.pdf' }]);
    access.resolveAlternantAccess.mockResolvedValue({ relation: 'alternant' });

    await expect(service.getForDownload(user, 'd1')).rejects.toThrow('Fichier manquant');
    expect(access.resolveAlternantAccess).toHaveBeenCalledWith(user, 'profil-1');
  });

  it('remove throws NotFound for an unknown document', async () => {
    const { service, dbMock } = setup();
    dbMock.enqueue([]);

    await expect(service.remove(user, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(dbMock.db.delete).not.toHaveBeenCalled();
  });

  it('remove is denied when neither uploader nor manager', async () => {
    const { service, dbMock, access } = setup();
    dbMock.enqueue([
      {
        id: 'd1',
        alternantProfilId: 'profil-1',
        uploadedByUserId: 'someone-else',
        storageKey: 'k',
      },
    ]);
    access.resolveAlternantAccess.mockResolvedValue({ relation: 'alternant', canManage: false });

    await expect(service.remove(user, 'd1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(dbMock.db.delete).not.toHaveBeenCalled();
  });

  it('remove lets the uploader delete their own document', async () => {
    const { service, dbMock, access } = setup();
    dbMock.enqueue([
      { id: 'd1', alternantProfilId: 'profil-1', uploadedByUserId: user.id, storageKey: 'k' },
    ]);
    access.resolveAlternantAccess.mockResolvedValue({ relation: 'alternant', canManage: false });

    await expect(service.remove(user, 'd1')).resolves.toEqual({ id: 'd1' });
    expect(dbMock.db.delete).toHaveBeenCalledTimes(1);
  });

  it('remove lets a manager delete someone else’s document', async () => {
    const { service, dbMock, access } = setup();
    dbMock.enqueue([
      {
        id: 'd1',
        alternantProfilId: 'profil-1',
        uploadedByUserId: 'someone-else',
        storageKey: 'k',
      },
    ]);
    access.resolveAlternantAccess.mockResolvedValue({ relation: 'peda', canManage: true });

    await expect(service.remove(user, 'd1')).resolves.toEqual({ id: 'd1' });
    expect(dbMock.db.delete).toHaveBeenCalledTimes(1);
  });
});
