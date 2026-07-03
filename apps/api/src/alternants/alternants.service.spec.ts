import { describe, expect, it, vi } from 'vitest';
import { AlternantsService, type TutorAlternant } from './alternants.service';
import { createDbMock } from '../testing/db-mock';
import type { DatabaseService } from '../database/database.service';
import type { AuthUser } from '../auth/auth.types';

const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'tutor-1',
  email: 'tutor@example.com',
  name: 'Tutor One',
  emailVerified: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

function makeService(...results: unknown[][]) {
  const mock = createDbMock(...results);
  const service = new AlternantsService({ db: mock.db } as unknown as DatabaseService);
  return { service, mock };
}

const baseRow = {
  alternantProfilId: 'ap-1',
  name: 'Alice',
  email: 'alice@x.fr',
  promotionName: 'Promo 2026',
  referentielId: 'ref-1',
  entrepriseName: 'ACME',
  tuteurPedaUserId: 'tutor-1',
  tuteurEntrepriseUserId: 'tutor-2',
};

describe('AlternantsService', () => {
  describe('listForTutor', () => {
    it('returns an empty list when the user supervises nobody', async () => {
      const { service, mock } = makeService([]);
      await expect(service.listForTutor(makeUser())).resolves.toEqual([]);
      expect(mock.db.select).toHaveBeenCalledTimes(1);
    });

    it('maps the peda role with trinome names and progress', async () => {
      const { service } = makeService(
        [baseRow],
        [
          { id: 'tutor-1', name: 'Paul Peda' },
          { id: 'tutor-2', name: 'Emma Ent' },
        ],
        [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }], // referentiel competences
        [{ id: 'ev1' }, { id: 'ev2' }], // evaluations by the tutor
      );
      const result = await service.listForTutor(makeUser());
      expect(result).toEqual([
        {
          alternantProfilId: 'ap-1',
          name: 'Alice',
          email: 'alice@x.fr',
          promotionName: 'Promo 2026',
          entrepriseName: 'ACME',
          tuteurPedaName: 'Paul Peda',
          tuteurEntrepriseName: 'Emma Ent',
          myRole: 'peda',
          progress: { evaluated: 2, total: 3 },
        },
      ]);
    });

    it('detects the entreprise role when the user is the company tutor', async () => {
      const row = { ...baseRow, tuteurPedaUserId: 'someone-else' };
      const { service } = makeService(
        [row],
        [
          { id: 'someone-else', name: 'Paul Peda' },
          { id: 'tutor-2', name: 'Emma Ent' },
        ],
        [{ id: 'c1' }],
        [],
      );
      const [alternant] = await service.listForTutor(makeUser({ id: 'tutor-2' }));
      expect(alternant.myRole).toBe('entreprise');
      expect(alternant.progress).toEqual({ evaluated: 0, total: 1 });
    });

    it('short-circuits progress to 0/0 when the promotion has no referentiel', async () => {
      const row = { ...baseRow, referentielId: null };
      const { service, mock } = makeService([row], [{ id: 'tutor-1', name: 'Paul Peda' }]);
      const [alternant] = await service.listForTutor(makeUser());
      expect(alternant.progress).toEqual({ evaluated: 0, total: 0 });
      // Only the association listing + tutor names queries ran.
      expect(mock.db.select).toHaveBeenCalledTimes(2);
    });

    it('computes progress per apprentice across several rows', async () => {
      const row2 = { ...baseRow, alternantProfilId: 'ap-2', name: 'Bob', email: 'bob@x.fr' };
      const { service } = makeService(
        [baseRow, row2],
        [
          { id: 'tutor-1', name: 'Paul Peda' },
          { id: 'tutor-2', name: 'Emma Ent' },
        ],
        [{ id: 'c1' }, { id: 'c2' }], // total for ap-1
        [{ id: 'ev1' }], // evaluated for ap-1
        [{ id: 'c1' }, { id: 'c2' }], // total for ap-2
        [], // evaluated for ap-2
      );
      const result = await service.listForTutor(makeUser());
      expect(result.map((a) => a.progress)).toEqual([
        { evaluated: 1, total: 2 },
        { evaluated: 0, total: 2 },
      ]);
    });
  });

  describe('tutorDashboard', () => {
    const supervised = (progress: { evaluated: number; total: number }): TutorAlternant => ({
      alternantProfilId: 'ap-1',
      name: 'Alice',
      email: 'alice@x.fr',
      promotionName: null,
      entrepriseName: null,
      tuteurPedaName: null,
      tuteurEntrepriseName: null,
      myRole: 'peda',
      progress,
    });

    it('derives the number of competences left to evaluate and upcoming bilans', async () => {
      const { service } = makeService([{ id: 'b1' }, { id: 'b2' }]);
      vi.spyOn(service, 'listForTutor').mockResolvedValue([supervised({ evaluated: 2, total: 5 })]);
      const dashboard = await service.tutorDashboard(makeUser());
      expect(dashboard.alternants[0].toEvaluate).toBe(3);
      expect(dashboard.upcomingBilans).toBe(2);
    });

    it('clamps toEvaluate at zero and skips the bilan query without apprentices', async () => {
      const { service, mock } = makeService();
      vi.spyOn(service, 'listForTutor').mockResolvedValue([]);
      const dashboard = await service.tutorDashboard(makeUser());
      expect(dashboard).toEqual({ alternants: [], upcomingBilans: 0 });
      expect(mock.db.select).not.toHaveBeenCalled();

      const { service: service2 } = makeService([]);
      vi.spyOn(service2, 'listForTutor').mockResolvedValue([
        supervised({ evaluated: 7, total: 5 }),
      ]);
      const dashboard2 = await service2.tutorDashboard(makeUser());
      expect(dashboard2.alternants[0].toEvaluate).toBe(0);
    });
  });

  describe('alternantDashboard', () => {
    it('returns null when the user has no apprentice profile', async () => {
      const { service } = makeService([]);
      await expect(service.alternantDashboard(makeUser())).resolves.toBeNull();
    });

    it('returns an empty dashboard for an apprentice without promotion', async () => {
      const { service } = makeService(
        [{ id: 'ap-1', promotionId: null }],
        [], // association
        [], // next bilan
      );
      const dashboard = await service.alternantDashboard(makeUser());
      expect(dashboard).toEqual({
        titleName: '',
        progressionPct: 0,
        blocs: { validated: 0, total: 0 },
        competences: { acquired: 0, total: 0 },
        toSelfEvaluate: 0,
        trinome: { peda: null, entrepriseTutor: null, entreprise: null },
        nextBilan: null,
      });
    });

    it('skips referentiel aggregations when the promotion has none', async () => {
      const { service, mock } = makeService(
        [{ id: 'ap-1', promotionId: 'pr-1' }],
        [{ referentielId: null }], // promotion without referentiel
        [], // association
        [], // next bilan
      );
      const dashboard = await service.alternantDashboard(makeUser());
      expect(dashboard?.titleName).toBe('');
      expect(dashboard?.competences).toEqual({ acquired: 0, total: 0 });
      expect(mock.db.select).toHaveBeenCalledTimes(4);
    });

    it('aggregates blocs, competences and progression from auto evaluations', async () => {
      const scheduledAt = new Date('2026-09-01T09:00:00Z');
      const { service } = makeService(
        [{ id: 'ap-1', promotionId: 'pr-1' }],
        [{ referentielId: 'ref-1' }],
        [{ title: 'Titre RNCP 7' }],
        [
          { id: 'c1', blocId: 'b1' },
          { id: 'c2', blocId: 'b1' },
          { id: 'c3', blocId: 'b2' },
          { id: 'c4', blocId: 'b2' },
        ],
        [
          { competenceId: 'c1', level: 'A' },
          { competenceId: 'c2', level: 'M' },
          { competenceId: 'c3', level: 'EC' },
          { competenceId: 'c4', level: 'NA' },
        ],
        [
          {
            id: 'assoc-1',
            alternantProfilId: 'ap-1',
            tuteurPedaUserId: 't1',
            tuteurEntrepriseUserId: 't2',
            entrepriseId: 'e1',
          },
        ],
        [
          { id: 't1', name: 'Paul Peda' },
          { id: 't2', name: 'Emma Ent' },
        ],
        [{ name: 'ACME' }],
        [{ label: 'Bilan mi-parcours', scheduledAt }],
      );
      const dashboard = await service.alternantDashboard(makeUser({ id: 'alt-user' }));
      expect(dashboard).toEqual({
        titleName: 'Titre RNCP 7',
        // 2 acquired (A/M) out of 4 -> 50%.
        progressionPct: 50,
        // b1 fully A/M is validated, b2 is not.
        blocs: { validated: 1, total: 2 },
        competences: { acquired: 2, total: 4 },
        // c4 is NA: 3 evaluated out of 4 leaves 1 to self-evaluate.
        toSelfEvaluate: 1,
        trinome: { peda: 'Paul Peda', entrepriseTutor: 'Emma Ent', entreprise: 'ACME' },
        nextBilan: { label: 'Bilan mi-parcours', scheduledAt },
      });
    });

    it('resolves a partial trinome with a single tutor and no company', async () => {
      const { service } = makeService(
        [{ id: 'ap-1', promotionId: null }],
        [
          {
            id: 'assoc-1',
            alternantProfilId: 'ap-1',
            tuteurPedaUserId: 't1',
            tuteurEntrepriseUserId: null,
            entrepriseId: null,
          },
        ],
        [{ id: 't1', name: 'Paul Peda' }],
        [], // next bilan
      );
      const dashboard = await service.alternantDashboard(makeUser());
      expect(dashboard?.trinome).toEqual({
        peda: 'Paul Peda',
        entrepriseTutor: null,
        entreprise: null,
      });
    });

    it('guards the progression against a referentiel without competences', async () => {
      const { service } = makeService(
        [{ id: 'ap-1', promotionId: 'pr-1' }],
        [{ referentielId: 'ref-1' }],
        [{ title: 'Titre RNCP 7' }],
        [], // no competences
        [], // no evaluations
        [], // association
        [], // next bilan
      );
      const dashboard = await service.alternantDashboard(makeUser());
      expect(dashboard?.progressionPct).toBe(0);
      expect(dashboard?.blocs).toEqual({ validated: 0, total: 0 });
      expect(dashboard?.toSelfEvaluate).toBe(0);
    });
  });
});
