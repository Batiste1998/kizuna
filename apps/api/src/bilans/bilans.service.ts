import { randomUUID } from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { schema, type BilanStatus } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import { AccessService } from '../access/access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AiService } from '../ai/ai.service';
import type { AuthUser } from '../auth/auth.types';
import { renderBilanPdf } from './bilan-pdf';

type Bilan = typeof schema.bilan.$inferSelect;

export interface BilansView {
  alternantProfilId: string;
  canManage: boolean;
  bilans: Bilan[];
}

@Injectable()
export class BilansService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: AccessService,
    private readonly notifications: NotificationsService,
    private readonly ai: AiService,
  ) {}

  private get db() {
    return this.database.db;
  }

  async list(user: AuthUser, alternantProfilId: string): Promise<BilansView> {
    const { canManage } = await this.access.resolveAlternantAccess(user, alternantProfilId);
    const bilans = await this.db
      .select()
      .from(schema.bilan)
      .where(eq(schema.bilan.alternantProfilId, alternantProfilId))
      .orderBy(schema.bilan.scheduledAt);
    return { alternantProfilId, canManage, bilans };
  }

  async create(
    user: AuthUser,
    alternantProfilId: string,
    input: { label: string; scheduledAt: string },
  ): Promise<Bilan> {
    const { profil, canManage } = await this.access.resolveAlternantAccess(user, alternantProfilId);
    if (!canManage)
      throw new ForbiddenException('Seuls les tuteurs ou l’admin planifient un bilan');

    const [created] = await this.db
      .insert(schema.bilan)
      .values({
        alternantProfilId,
        label: input.label,
        scheduledAt: new Date(input.scheduledAt),
        createdByUserId: user.id,
      })
      .returning();

    if (profil.userId !== user.id) {
      await this.notifications.create({
        userId: profil.userId,
        type: 'bilan',
        title: 'Bilan planifié',
        detail: input.label,
        href: '/app/bilans',
      });
    }
    return created;
  }

  async update(
    user: AuthUser,
    bilanId: string,
    input: {
      status?: BilanStatus;
      label?: string;
      scheduledAt?: string;
      summary?: string;
      visioUrl?: string | null;
    },
  ): Promise<Bilan> {
    const [existing] = await this.db
      .select()
      .from(schema.bilan)
      .where(eq(schema.bilan.id, bilanId));
    if (!existing) throw new NotFoundException('Bilan introuvable');

    const { canManage } = await this.access.resolveAlternantAccess(
      user,
      existing.alternantProfilId,
    );
    if (!canManage) throw new ForbiddenException('Modification réservée aux tuteurs / admin');

    const [updated] = await this.db
      .update(schema.bilan)
      .set({
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.scheduledAt !== undefined ? { scheduledAt: new Date(input.scheduledAt) } : {}),
        ...(input.summary !== undefined ? { summary: input.summary } : {}),
        ...(input.visioUrl !== undefined ? { visioUrl: input.visioUrl } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.bilan.id, bilanId))
      .returning();
    return updated;
  }

  /**
   * Attaches a video-conference link to the bilan (idempotent: an existing link
   * is returned as-is). Jitsi Meet rooms exist by URL alone — no API key needed;
   * the random slug keeps the room unguessable.
   */
  async generateVisio(user: AuthUser, bilanId: string): Promise<Bilan> {
    const [existing] = await this.db
      .select()
      .from(schema.bilan)
      .where(eq(schema.bilan.id, bilanId));
    if (!existing) throw new NotFoundException('Bilan introuvable');

    const { profil, canManage } = await this.access.resolveAlternantAccess(
      user,
      existing.alternantProfilId,
    );
    if (!canManage) throw new ForbiddenException('Génération réservée aux tuteurs / admin');
    if (existing.visioUrl) return existing;

    const visioUrl = `https://meet.jit.si/kizuna-bilan-${randomUUID()}`;
    const [updated] = await this.db
      .update(schema.bilan)
      .set({ visioUrl, updatedAt: new Date() })
      .where(eq(schema.bilan.id, bilanId))
      .returning();

    if (profil.userId !== user.id) {
      await this.notifications.create({
        userId: profil.userId,
        type: 'bilan',
        title: 'Lien visio ajouté au bilan',
        detail: `${existing.label} — rejoindre : ${visioUrl}`,
        href: '/app/bilans',
      });
    }
    return updated;
  }

  /**
   * Drafts the bilan summary from the semester's data — the three voices on
   * each competence and the validated journal entries. Returned as a proposal:
   * nothing is saved until the tutor edits and submits it.
   */
  async draftSummary(user: AuthUser, bilanId: string): Promise<{ draft: string }> {
    const [bilan] = await this.db.select().from(schema.bilan).where(eq(schema.bilan.id, bilanId));
    if (!bilan) throw new NotFoundException('Bilan introuvable');

    const { profil, canManage } = await this.access.resolveAlternantAccess(
      user,
      bilan.alternantProfilId,
    );
    if (!canManage) throw new ForbiddenException('Synthèse réservée aux tuteurs / admin');

    const [alternant] = await this.db
      .select({ name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, profil.userId));

    const evaluations = await this.db
      .select({
        competenceLabel: schema.competence.label,
        blocCode: schema.bloc.code,
        evaluator: schema.evaluation.evaluator,
        level: schema.evaluation.level,
      })
      .from(schema.evaluation)
      .innerJoin(schema.competence, eq(schema.evaluation.competenceId, schema.competence.id))
      .innerJoin(schema.bloc, eq(schema.competence.blocId, schema.bloc.id))
      .where(eq(schema.evaluation.alternantProfilId, bilan.alternantProfilId));

    const journal = await this.db
      .select({ title: schema.journalEntry.title, content: schema.journalEntry.content })
      .from(schema.journalEntry)
      .where(
        and(
          eq(schema.journalEntry.alternantProfilId, bilan.alternantProfilId),
          eq(schema.journalEntry.status, 'validated'),
        ),
      )
      .orderBy(desc(schema.journalEntry.createdAt))
      .limit(15);

    const levelLabels: Record<string, string> = {
      NA: 'non acquis',
      EC: 'en cours',
      A: 'acquis',
      M: 'maîtrisé',
    };
    const voiceLabels: Record<string, string> = {
      auto: 'auto-évaluation',
      peda: 'tuteur pédagogique',
      entreprise: 'tuteur entreprise',
    };
    const evalLines = evaluations
      .map(
        (e) =>
          `- [${e.blocCode}] ${e.competenceLabel} — ${voiceLabels[e.evaluator] ?? e.evaluator} : ${levelLabels[e.level] ?? e.level}`,
      )
      .join('\n');
    const journalLines = journal
      .map((j) => `- ${j.title} : ${j.content.slice(0, 300)}`)
      .join('\n');

    const draft = await this.ai.complete(
      'Tu rédiges le brouillon de synthèse d’un bilan tripartite d’alternance (école ' +
        'française, titre RNCP). Ton : professionnel, factuel, bienveillant. Structure ' +
        'attendue : points forts, axes de progression, objectifs pour la période suivante. ' +
        '150 à 250 mots, en français, sans titre ni signature. Appuie-toi uniquement sur ' +
        'les données fournies — n’invente aucun fait.',
      `Bilan « ${bilan.label} » planifié le ${bilan.scheduledAt.toLocaleDateString('fr-FR')} ` +
        `pour l’alternant ${alternant?.name ?? '—'}.\n\n` +
        `Évaluations des compétences (trois voix) :\n${evalLines || '(aucune évaluation)'}\n\n` +
        `Dernières entrées validées du journal d’activités :\n${journalLines || '(journal vide)'}`,
    );
    return { draft };
  }

  /** Assembles the trinôme context of a bilan and renders it as a PDF stream. */
  async exportPdf(user: AuthUser, bilanId: string) {
    const [bilan] = await this.db.select().from(schema.bilan).where(eq(schema.bilan.id, bilanId));
    if (!bilan) throw new NotFoundException('Bilan introuvable');

    const { profil, association } = await this.access.resolveAlternantAccess(
      user,
      bilan.alternantProfilId,
    );

    const userIds = [
      profil.userId,
      association?.tuteurPedaUserId,
      association?.tuteurEntrepriseUserId,
    ].filter(Boolean) as string[];
    const users = await this.db
      .select({ id: schema.user.id, name: schema.user.name })
      .from(schema.user)
      .where(inArray(schema.user.id, userIds));
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    const [org] = await this.db
      .select({ name: schema.organization.name })
      .from(schema.organization)
      .where(eq(schema.organization.id, profil.organizationId));
    const [promotion] = profil.promotionId
      ? await this.db
          .select({ name: schema.promotion.name })
          .from(schema.promotion)
          .where(eq(schema.promotion.id, profil.promotionId))
      : [];
    const [entreprise] = association?.entrepriseId
      ? await this.db
          .select({ name: schema.entreprise.name })
          .from(schema.entreprise)
          .where(eq(schema.entreprise.id, association.entrepriseId))
      : [];

    const pdf = renderBilanPdf({
      organizationName: org?.name ?? '',
      bilanLabel: bilan.label,
      scheduledAt: bilan.scheduledAt,
      status: bilan.status,
      summary: bilan.summary,
      alternantName: nameById.get(profil.userId) ?? '—',
      promotionName: promotion?.name ?? null,
      entrepriseName: entreprise?.name ?? null,
      tuteurPedaName: association?.tuteurPedaUserId
        ? (nameById.get(association.tuteurPedaUserId) ?? null)
        : null,
      tuteurEntrepriseName: association?.tuteurEntrepriseUserId
        ? (nameById.get(association.tuteurEntrepriseUserId) ?? null)
        : null,
      generatedAt: new Date(),
    });
    return { pdf, label: bilan.label };
  }
}
