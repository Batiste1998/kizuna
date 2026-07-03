import { randomUUID } from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { schema, type BilanStatus } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import { AccessService } from '../access/access.service';
import { NotificationsService } from '../notifications/notifications.service';
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
