import { describe, expect, it } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccessService } from './access.service';
import { createDbMock } from '../testing/db-mock';
import type { DatabaseService } from '../database/database.service';
import type { AuthUser } from '../auth/auth.types';

const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'user-1',
  email: 'user@example.com',
  name: 'User One',
  emailVerified: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const profil = { id: 'ap-1', userId: 'alt-user', organizationId: 'org-1', promotionId: null };
const association = {
  id: 'assoc-1',
  alternantProfilId: 'ap-1',
  tuteurPedaUserId: 'peda-user',
  tuteurEntrepriseUserId: 'ent-user',
  entrepriseId: 'e-1',
};

function makeService(...results: unknown[][]) {
  const mock = createDbMock(...results);
  const service = new AccessService({ db: mock.db } as unknown as DatabaseService);
  return { service, mock };
}

describe('AccessService', () => {
  describe('resolveAlternantAccess', () => {
    it('throws NotFoundException when the apprentice profile does not exist', async () => {
      const { service } = makeService([]);
      await expect(service.resolveAlternantAccess(makeUser(), 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('grants the apprentice self access with auto evaluator role', async () => {
      const { service } = makeService([profil], [association]);
      const access = await service.resolveAlternantAccess(makeUser({ id: 'alt-user' }), 'ap-1');
      expect(access).toEqual({
        profil,
        association,
        relation: 'alternant',
        editableAs: 'auto',
        canManage: false,
      });
    });

    it('returns a null association for an apprentice without a trinome', async () => {
      const { service } = makeService([profil], []);
      const access = await service.resolveAlternantAccess(makeUser({ id: 'alt-user' }), 'ap-1');
      expect(access.relation).toBe('alternant');
      expect(access.association).toBeNull();
    });

    it('prefers the alternant relation over a platform role', async () => {
      const { service } = makeService([profil], [association]);
      const access = await service.resolveAlternantAccess(
        makeUser({ id: 'alt-user', role: 'super_admin' }),
        'ap-1',
      );
      expect(access.relation).toBe('alternant');
      expect(access.editableAs).toBe('auto');
    });

    it('grants the tuteur pedagogique manage access with peda evaluator role', async () => {
      const { service } = makeService([profil], [association]);
      const access = await service.resolveAlternantAccess(makeUser({ id: 'peda-user' }), 'ap-1');
      expect(access).toEqual({
        profil,
        association,
        relation: 'peda',
        editableAs: 'peda',
        canManage: true,
      });
    });

    it('grants the tuteur entreprise manage access with entreprise evaluator role', async () => {
      const { service } = makeService([profil], [association]);
      const access = await service.resolveAlternantAccess(makeUser({ id: 'ent-user' }), 'ap-1');
      expect(access).toEqual({
        profil,
        association,
        relation: 'entreprise',
        editableAs: 'entreprise',
        canManage: true,
      });
    });

    it('grants a super_admin read-only platform access', async () => {
      const { service, mock } = makeService([profil], [association]);
      const access = await service.resolveAlternantAccess(
        makeUser({ role: 'super_admin' }),
        'ap-1',
      );
      expect(access.relation).toBe('platform');
      expect(access.editableAs).toBeNull();
      expect(access.canManage).toBe(false);
      // Platform roles short-circuit before the membership lookup.
      expect(mock.db.select).toHaveBeenCalledTimes(2);
    });

    it('grants a support user read-only platform access', async () => {
      const { service } = makeService([profil], []);
      const access = await service.resolveAlternantAccess(makeUser({ role: 'support' }), 'ap-1');
      expect(access.relation).toBe('platform');
      expect(access.association).toBeNull();
      expect(access.canManage).toBe(false);
    });

    it('grants an establishment admin manage access without evaluator role', async () => {
      const membership = { id: 'm-1', organizationId: 'org-1', userId: 'user-1', role: 'admin' };
      const { service, mock } = makeService([profil], [association], [membership]);
      const access = await service.resolveAlternantAccess(makeUser(), 'ap-1');
      expect(access).toEqual({
        profil,
        association,
        relation: 'admin',
        editableAs: null,
        canManage: true,
      });
      expect(mock.db.select).toHaveBeenCalledTimes(3);
    });

    it('normalizes a missing association to null for an establishment admin', async () => {
      const membership = { id: 'm-1', organizationId: 'org-1', userId: 'user-1', role: 'owner' };
      const { service } = makeService([profil], [], [membership]);
      const access = await service.resolveAlternantAccess(makeUser(), 'ap-1');
      expect(access.relation).toBe('admin');
      expect(access.association).toBeNull();
    });

    it('throws ForbiddenException for a user with no link to the apprentice', async () => {
      const { service } = makeService([profil], [association], []);
      await expect(service.resolveAlternantAccess(makeUser(), 'ap-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException for a plain user even without any association', async () => {
      const { service } = makeService([profil], [], []);
      await expect(
        service.resolveAlternantAccess(makeUser({ role: 'user' }), 'ap-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getMyAlternantProfileId', () => {
    it('returns the profile id of the logged-in apprentice', async () => {
      const { service } = makeService([{ id: 'ap-1' }]);
      await expect(service.getMyAlternantProfileId(makeUser({ id: 'alt-user' }))).resolves.toBe(
        'ap-1',
      );
    });

    it('returns null when the user has no apprentice profile', async () => {
      const { service } = makeService([]);
      await expect(service.getMyAlternantProfileId(makeUser())).resolves.toBeNull();
    });
  });
});
