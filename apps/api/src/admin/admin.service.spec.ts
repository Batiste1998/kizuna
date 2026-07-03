import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { createDbMock } from '../testing/db-mock';
import type { DatabaseService } from '../database/database.service';
import type { MailService } from '../mail/mail.service';
import type { AiService } from '../ai/ai.service';
import type { Auth } from '../auth/auth';
import type { AuthUser } from '../auth/auth.types';

const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin One',
  emailVerified: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const membershipRows = [{ organizationId: 'org-1' }];

function makeService(options: { results?: unknown[][]; smtpConfigured?: boolean } = {}) {
  const mock = createDbMock(...(options.results ?? []));
  const signUpEmail = vi.fn().mockResolvedValue({ user: { id: 'new-user' } });
  const requestPasswordReset = vi.fn().mockResolvedValue(undefined);
  const extractReferentiel = vi.fn();
  const service = new AdminService(
    { db: mock.db } as unknown as DatabaseService,
    { getOrThrow: vi.fn().mockReturnValue('https://web.test') } as unknown as ConfigService,
    { isConfigured: options.smtpConfigured ?? false } as unknown as MailService,
    { isConfigured: false, extractReferentiel } as unknown as AiService,
    { api: { signUpEmail, requestPasswordReset } } as unknown as Auth,
  );
  return { service, mock, signUpEmail, requestPasswordReset, extractReferentiel };
}

describe('AdminService', () => {
  describe('org resolution', () => {
    it('rejects users who administrate no organization', async () => {
      const { service } = makeService({ results: [[]] });
      await expect(service.listAlternants(makeUser())).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('uses the session active organization for a multi-school admin', async () => {
      const memberships = [{ organizationId: 'org-1' }, { organizationId: 'org-2' }];
      const schools = [
        { id: 'org-1', name: 'School A', city: null },
        { id: 'org-2', name: 'School B', city: 'Lyon' },
      ];
      const { service } = makeService({ results: [memberships, schools] });
      const result = await service.listSchools(makeUser({ activeOrganizationId: 'org-2' }));
      expect(result.activeId).toBe('org-2');
      expect(result.schools).toEqual(schools);
    });

    it('falls back to the first administrated org when the active one is foreign', async () => {
      const memberships = [{ organizationId: 'org-1' }, { organizationId: 'org-2' }];
      const { service } = makeService({ results: [memberships, []] });
      const result = await service.listSchools(makeUser({ activeOrganizationId: 'org-x' }));
      expect(result.activeId).toBe('org-1');
    });

    it('returns an empty school list without querying organizations', async () => {
      const { service, mock } = makeService({ results: [[]] });
      const result = await service.listSchools(makeUser());
      expect(result).toEqual({ activeId: null, schools: [] });
      expect(mock.db.select).toHaveBeenCalledTimes(1);
    });

    it('dedupes duplicate memberships in the same organization', async () => {
      const memberships = [{ organizationId: 'org-1' }, { organizationId: 'org-1' }];
      const schools = [{ id: 'org-1', name: 'School A', city: null }];
      const { service } = makeService({ results: [memberships, schools] });
      const result = await service.listSchools(makeUser());
      expect(result.activeId).toBe('org-1');
      expect(result.schools).toHaveLength(1);
    });
  });

  describe('dashboard', () => {
    it('computes association completeness, late bilans and promo progress', async () => {
      const profils = [
        { id: 'p1', userId: 'u1', promotionId: 'pr1' },
        { id: 'p2', userId: 'u2', promotionId: 'pr1' },
      ];
      const associations = [
        {
          alternantProfilId: 'p1',
          entrepriseId: 'e1',
          tuteurPedaUserId: 't1',
          tuteurEntrepriseUserId: 't2',
        },
        {
          alternantProfilId: 'p2',
          entrepriseId: 'e1',
          tuteurPedaUserId: null,
          tuteurEntrepriseUserId: 't2',
        },
      ];
      const { service } = makeService({
        results: [
          membershipRows,
          [{ name: 'School A' }],
          profils,
          associations,
          [{ alternantProfilId: 'p1' }], // late bilan
          [
            { id: 'u1', name: 'Alice' },
            { id: 'u2', name: 'Bob' },
          ],
          [{ id: 'pr1', name: 'Promo 2026' }],
          [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }],
          [
            { alternantProfilId: 'p1', level: 'A' },
            { alternantProfilId: 'p1', level: 'EC' },
            { alternantProfilId: 'p1', level: 'NA' },
            { alternantProfilId: 'p2', level: 'A' },
            { alternantProfilId: 'p2', level: 'M' },
            { alternantProfilId: 'p2', level: 'EC' },
            { alternantProfilId: 'p2', level: 'A' },
          ],
        ],
      });

      const dashboard = await service.dashboard(makeUser());
      expect(dashboard.organizationName).toBe('School A');
      expect(dashboard.counts).toEqual({
        alternants: 2,
        associationsComplete: 1,
        associationsPartial: 1,
        lateBilans: 1,
      });
      expect(dashboard.suiviATraiter).toEqual([
        {
          alternantProfilId: 'p1',
          name: 'Alice',
          reason: 'Bilan de suivi en retard',
          status: 'late',
        },
        {
          alternantProfilId: 'p2',
          name: 'Bob',
          reason: 'À assigner : tuteur pédagogique',
          status: 'incomplete',
        },
      ]);
      // p1: 2/4 non-NA auto evals, p2: 4/4 -> average 75%.
      expect(dashboard.promotions).toEqual([
        { id: 'pr1', name: 'Promo 2026', alternantCount: 2, progressPct: 75 },
      ]);
    });

    it('returns zeroed counts when the organization has no apprentices', async () => {
      const { service } = makeService({
        results: [
          membershipRows,
          [{ name: 'School A' }],
          [], // profils
          [{ id: 'pr1', name: 'Promo 2026' }],
          [{ id: 'c1' }],
        ],
      });
      const dashboard = await service.dashboard(makeUser());
      expect(dashboard.counts).toEqual({
        alternants: 0,
        associationsComplete: 0,
        associationsPartial: 0,
        lateBilans: 0,
      });
      expect(dashboard.suiviATraiter).toEqual([]);
      expect(dashboard.promotions).toEqual([
        { id: 'pr1', name: 'Promo 2026', alternantCount: 0, progressPct: 0 },
      ]);
    });

    it('caps the suivi list at 8 entries', async () => {
      const profils = Array.from({ length: 10 }, (_, i) => ({
        id: `p${i}`,
        userId: `u${i}`,
        promotionId: null,
      }));
      const users = profils.map((p) => ({ id: p.userId, name: `User ${p.id}` }));
      const { service } = makeService({
        results: [membershipRows, [{ name: 'School A' }], profils, [], [], users, [], [], []],
      });
      const dashboard = await service.dashboard(makeUser());
      expect(dashboard.suiviATraiter).toHaveLength(8);
      expect(dashboard.suiviATraiter[0].reason).toBe(
        "À assigner : entreprise, tuteur d'entreprise, tuteur pédagogique",
      );
    });
  });

  describe('listAlternants', () => {
    it('returns an empty list when the organization has no apprentices', async () => {
      const { service } = makeService({ results: [membershipRows, []] });
      await expect(service.listAlternants(makeUser())).resolves.toEqual([]);
    });

    it('maps trinome, suivi status and self-evaluation progress per apprentice', async () => {
      const profils = [
        { id: 'p1', userId: 'u1', promotionId: 'pr1', organizationId: 'org-1' },
        { id: 'p2', userId: 'u2', promotionId: null, organizationId: 'org-1' },
        { id: 'p3', userId: 'u3', promotionId: 'pr1', organizationId: 'org-1' },
      ];
      const associations = [
        {
          alternantProfilId: 'p1',
          entrepriseId: 'e1',
          tuteurPedaUserId: 't1',
          tuteurEntrepriseUserId: 't2',
        },
        {
          alternantProfilId: 'p2',
          entrepriseId: 'e1',
          tuteurPedaUserId: 't1',
          tuteurEntrepriseUserId: 't2',
        },
        {
          alternantProfilId: 'p3',
          entrepriseId: 'e1',
          tuteurPedaUserId: null,
          tuteurEntrepriseUserId: null,
        },
      ];
      const users = [
        { id: 'u1', name: 'Alice', email: 'alice@x.fr' },
        { id: 'u2', name: 'Bob', email: 'bob@x.fr' },
        { id: 'u3', name: 'Carl', email: 'carl@x.fr' },
        { id: 't1', name: 'Tuteur Peda', email: 'peda@x.fr' },
        { id: 't2', name: 'Tuteur Ent', email: 'ent@x.fr' },
      ];
      const { service } = makeService({
        results: [
          membershipRows,
          profils,
          associations,
          [{ id: 'pr1', name: 'Promo 2026' }],
          [{ id: 'e1', name: 'ACME' }],
          users,
          [{ alternantProfilId: 'p2' }], // late bilan
          [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }],
          [
            { alternantProfilId: 'p1', level: 'A' },
            { alternantProfilId: 'p1', level: 'M' },
            // p3 evaluated more times than the referentiel size: pct is clamped.
            ...Array.from({ length: 5 }, () => ({ alternantProfilId: 'p3', level: 'A' })),
          ],
        ],
      });

      const rows = await service.listAlternants(makeUser());
      expect(rows).toEqual([
        {
          alternantProfilId: 'p1',
          name: 'Alice',
          email: 'alice@x.fr',
          promotionName: 'Promo 2026',
          entrepriseName: 'ACME',
          tuteurPedaName: 'Tuteur Peda',
          tuteurEntrepriseName: 'Tuteur Ent',
          suivi: 'a_jour',
          progressPct: 50,
        },
        {
          alternantProfilId: 'p2',
          name: 'Bob',
          email: 'bob@x.fr',
          promotionName: null,
          entrepriseName: 'ACME',
          tuteurPedaName: 'Tuteur Peda',
          tuteurEntrepriseName: 'Tuteur Ent',
          suivi: 'en_retard',
          progressPct: 0,
        },
        {
          alternantProfilId: 'p3',
          name: 'Carl',
          email: 'carl@x.fr',
          promotionName: 'Promo 2026',
          entrepriseName: 'ACME',
          tuteurPedaName: null,
          tuteurEntrepriseName: null,
          suivi: 'a_completer',
          progressPct: 100,
        },
      ]);
    });

    it('reports 0% progress when the referentiel has no competences', async () => {
      const profils = [{ id: 'p1', userId: 'u1', promotionId: null, organizationId: 'org-1' }];
      const { service } = makeService({
        results: [
          membershipRows,
          profils,
          [], // associations
          [{ id: 'u1', name: 'Alice', email: 'alice@x.fr' }],
          [], // late bilans
          [], // competences (division by zero guard)
          [{ alternantProfilId: 'p1', level: 'A' }],
        ],
      });
      const [row] = await service.listAlternants(makeUser());
      expect(row.progressPct).toBe(0);
      expect(row.suivi).toBe('a_completer');
    });
  });

  describe('upsertAssociation', () => {
    it('throws NotFoundException when the apprentice is not in the admin org', async () => {
      const { service } = makeService({ results: [membershipRows, []] });
      await expect(
        service.upsertAssociation(makeUser(), 'ap-x', { entrepriseId: 'e1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a tutor that is not a member of the organization', async () => {
      const { service } = makeService({
        results: [membershipRows, [{ id: 'ap-1' }], []],
      });
      await expect(
        service.upsertAssociation(makeUser(), 'ap-1', { tuteurPedaUserId: 'stranger' }),
      ).rejects.toThrow('Tuteur introuvable dans l’établissement');
    });

    it('rejects an entreprise that belongs to another organization', async () => {
      const { service } = makeService({
        results: [membershipRows, [{ id: 'ap-1' }], []],
      });
      await expect(
        service.upsertAssociation(makeUser(), 'ap-1', { entrepriseId: 'e-x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates the association when the apprentice has none', async () => {
      const created = {
        id: 'assoc-1',
        alternantProfilId: 'ap-1',
        tuteurPedaUserId: 't1',
        tuteurEntrepriseUserId: 't2',
        entrepriseId: 'e1',
      };
      const { service, mock } = makeService({
        results: [
          membershipRows,
          [{ id: 'ap-1' }],
          [{ id: 'm-t1' }], // tuteur peda membership
          [{ id: 'm-t2' }], // tuteur entreprise membership
          [{ id: 'e1' }], // entreprise
          [], // no existing association
          [created], // insert .returning()
        ],
      });
      const result = await service.upsertAssociation(makeUser(), 'ap-1', {
        tuteurPedaUserId: 't1',
        tuteurEntrepriseUserId: 't2',
        entrepriseId: 'e1',
      });
      expect(result).toEqual(created);
      expect(mock.db.insert).toHaveBeenCalledTimes(1);
      expect(mock.chains[6].values).toHaveBeenCalledWith({
        alternantProfilId: 'ap-1',
        tuteurPedaUserId: 't1',
        tuteurEntrepriseUserId: 't2',
        entrepriseId: 'e1',
      });
    });

    it('updates only the provided fields and keeps the rest of the trinome', async () => {
      const existing = {
        id: 'assoc-1',
        alternantProfilId: 'ap-1',
        tuteurPedaUserId: 't-old',
        tuteurEntrepriseUserId: 't2',
        entrepriseId: 'e1',
      };
      const updated = { ...existing, tuteurPedaUserId: 't-new' };
      const { service, mock } = makeService({
        results: [
          membershipRows,
          [{ id: 'ap-1' }],
          [{ id: 'm-t-new' }], // new tuteur peda membership
          [existing],
          [updated], // update .returning()
        ],
      });
      const result = await service.upsertAssociation(makeUser(), 'ap-1', {
        tuteurPedaUserId: 't-new',
      });
      expect(result).toEqual(updated);
      expect(mock.db.update).toHaveBeenCalledTimes(1);
      expect(mock.chains[4].set).toHaveBeenCalledWith({
        tuteurPedaUserId: 't-new',
        tuteurEntrepriseUserId: 't2',
        entrepriseId: 'e1',
      });
    });
  });

  describe('createMember', () => {
    it('reuses an existing user account without sending an invitation', async () => {
      const { service, signUpEmail } = makeService({
        results: [
          membershipRows,
          [{ id: 'u-exist' }], // user found by email
          [], // no member row yet
          [], // insert member
        ],
      });
      const result = await service.createMember(makeUser(), {
        name: 'Paula',
        email: 'paula@x.fr',
        role: 'tuteur_pedagogique',
      });
      expect(result).toEqual({
        userId: 'u-exist',
        role: 'tuteur_pedagogique',
        alternantProfilId: null,
        temporaryPassword: null,
        invitationSent: false,
      });
      expect(signUpEmail).not.toHaveBeenCalled();
    });

    it('creates the account and sends an invitation when SMTP is configured', async () => {
      const { service, signUpEmail, requestPasswordReset } = makeService({
        smtpConfigured: true,
        results: [
          membershipRows,
          [], // unknown email
          [], // no member row yet
          [], // insert member
        ],
      });
      const result = await service.createMember(makeUser(), {
        name: 'Paula',
        email: 'paula@x.fr',
        role: 'tuteur_entreprise',
      });
      expect(result.userId).toBe('new-user');
      expect(result.invitationSent).toBe(true);
      expect(result.temporaryPassword).toBeNull();
      expect(signUpEmail).toHaveBeenCalledWith({
        body: expect.objectContaining({ name: 'Paula', email: 'paula@x.fr' }),
      });
      expect(requestPasswordReset).toHaveBeenCalledWith({
        body: {
          email: 'paula@x.fr',
          redirectTo: 'https://web.test/reset-password?invitation=1',
        },
      });
    });

    it('hands back a temporary password when no SMTP transport is configured', async () => {
      const { service } = makeService({
        smtpConfigured: false,
        results: [membershipRows, [], [], []],
      });
      const result = await service.createMember(makeUser(), {
        name: 'Paula',
        email: 'paula@x.fr',
        role: 'tuteur_entreprise',
      });
      expect(result.invitationSent).toBe(false);
      expect(result.temporaryPassword).toMatch(/^Kz-/);
    });

    it('provisions the apprentice profile for the alternant role', async () => {
      const { service } = makeService({
        results: [
          membershipRows,
          [{ id: 'u-exist' }],
          [{ id: 'm-1', role: 'alternant' }], // member already exists with same role
          [{ id: 'pr1' }], // promotion belongs to the org
          [], // no profile yet
          [{ id: 'ap-new' }], // insert profile .returning()
        ],
      });
      const result = await service.createMember(makeUser(), {
        name: 'Alt',
        email: 'alt@x.fr',
        role: 'alternant',
        promotionId: 'pr1',
      });
      expect(result.alternantProfilId).toBe('ap-new');
      expect(result.role).toBe('alternant');
    });

    it('rejects a promotion that belongs to another organization', async () => {
      const { service } = makeService({
        results: [
          membershipRows,
          [{ id: 'u-exist' }],
          [{ id: 'm-1', role: 'alternant' }],
          [], // promotion not found in org
        ],
      });
      await expect(
        service.createMember(makeUser(), {
          name: 'Alt',
          email: 'alt@x.fr',
          role: 'alternant',
          promotionId: 'pr-x',
        }),
      ).rejects.toThrow('Promotion introuvable');
    });
  });

  describe('referentiel', () => {
    const PROMO = { id: 'promo-1', organizationId: 'org-1', referentielId: null };
    const DRAFT = {
      code: 'RNCP39583',
      title: 'Expert en ingénierie du logiciel',
      level: 7,
      blocs: [
        {
          code: 'BC01',
          label: 'Concevoir et modéliser',
          competences: [{ code: 'C1', label: 'Analyser les besoins', description: null }],
        },
      ],
    };

    it('getPromotionReferentiel rejects an unknown promotion', async () => {
      const { service } = makeService({ results: [membershipRows, []] });
      await expect(
        service.getPromotionReferentiel(makeUser(), 'promo-x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('getPromotionReferentiel returns null when the promotion has no referentiel', async () => {
      const { service } = makeService({ results: [membershipRows, [PROMO]] });
      const view = await service.getPromotionReferentiel(makeUser(), 'promo-1');
      expect(view).toEqual({ promotionId: 'promo-1', referentiel: null });
    });

    it('getPromotionReferentiel assembles blocs and their compétences in order', async () => {
      const { service } = makeService({
        results: [
          membershipRows,
          [{ ...PROMO, referentielId: 'ref-1' }],
          [{ id: 'ref-1', code: 'RNCP39583', title: 'Expert', level: 7 }],
          [
            { id: 'b-1', code: 'BC01', label: 'Concevoir' },
            { id: 'b-2', code: 'BC02', label: 'Développer' },
          ],
          [
            { id: 'c-1', blocId: 'b-1', code: 'C1', label: 'Analyser', description: null },
            { id: 'c-2', blocId: 'b-2', code: 'C2', label: 'Tester', description: 'Critères' },
          ],
        ],
      });

      const view = await service.getPromotionReferentiel(makeUser(), 'promo-1');

      expect(view.referentiel?.code).toBe('RNCP39583');
      expect(view.referentiel?.blocs).toHaveLength(2);
      expect(view.referentiel?.blocs[0].competences).toEqual([
        { id: 'c-1', code: 'C1', label: 'Analyser', description: null },
      ]);
      expect(view.referentiel?.blocs[1].competences).toEqual([
        { id: 'c-2', code: 'C2', label: 'Tester', description: 'Critères' },
      ]);
    });

    it('extractReferentiel checks the org then delegates to the AI gateway', async () => {
      const { service, extractReferentiel } = makeService({ results: [membershipRows] });
      extractReferentiel.mockResolvedValue(DRAFT);

      const result = await service.extractReferentiel(makeUser(), 'Texte RNCP collé');

      expect(result).toBe(DRAFT);
      expect(extractReferentiel).toHaveBeenCalledWith('Texte RNCP collé');
    });

    it('savePromotionReferentiel refuses to overwrite an existing referentiel', async () => {
      const { service, mock } = makeService({
        results: [membershipRows, [{ ...PROMO, referentielId: 'ref-1' }]],
      });

      await expect(
        service.savePromotionReferentiel(makeUser(), 'promo-1', DRAFT),
      ).rejects.toThrow('déjà un référentiel');
      expect(mock.db.transaction).not.toHaveBeenCalled();
    });

    it('savePromotionReferentiel persists the tree in one transaction and links the promotion', async () => {
      const { service, mock } = makeService({
        results: [
          membershipRows,
          [PROMO],
          // Transaction : referentiel, bloc, compétences (sans returning), update promotion.
          [{ id: 'ref-1' }],
          [{ id: 'b-1' }],
          [],
          [],
          // Relecture finale via getPromotionReferentiel.
          membershipRows,
          [{ ...PROMO, referentielId: 'ref-1' }],
          [{ id: 'ref-1', code: 'RNCP39583', title: 'Expert en ingénierie du logiciel', level: 7 }],
          [{ id: 'b-1', code: 'BC01', label: 'Concevoir et modéliser' }],
          [{ id: 'c-1', blocId: 'b-1', code: 'C1', label: 'Analyser les besoins', description: null }],
        ],
      });

      const view = await service.savePromotionReferentiel(makeUser(), 'promo-1', DRAFT);

      expect(mock.db.transaction).toHaveBeenCalledTimes(1);
      expect(view.referentiel?.id).toBe('ref-1');
      expect(view.referentiel?.blocs[0].competences[0].label).toBe('Analyser les besoins');
    });
  });
});
