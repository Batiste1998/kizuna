import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { schema } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import type { AuthUser } from '../auth/auth.types';

export interface AdminOverview {
  organizationName: string;
  counts: { alternants: number; members: number; entreprises: number; promotions: number };
}

@Injectable()
export class AdminService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  /** The organization the current user administrates, or 403. */
  private async resolveOrg(user: AuthUser): Promise<string> {
    const [membership] = await this.db
      .select()
      .from(schema.member)
      .where(and(eq(schema.member.userId, user.id), eq(schema.member.role, 'admin')));
    if (!membership) throw new ForbiddenException('Réservé aux administrateurs d’établissement');
    return membership.organizationId;
  }

  async overview(user: AuthUser): Promise<AdminOverview> {
    const orgId = await this.resolveOrg(user);
    const [org] = await this.db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, orgId));

    const [alternants, members, entreprises, promotions] = await Promise.all([
      this.db
        .select({ id: schema.alternantProfil.id })
        .from(schema.alternantProfil)
        .where(eq(schema.alternantProfil.organizationId, orgId)),
      this.db
        .select({ id: schema.member.id })
        .from(schema.member)
        .where(eq(schema.member.organizationId, orgId)),
      this.db
        .select({ id: schema.entreprise.id })
        .from(schema.entreprise)
        .where(eq(schema.entreprise.organizationId, orgId)),
      this.db
        .select({ id: schema.promotion.id })
        .from(schema.promotion)
        .where(eq(schema.promotion.organizationId, orgId)),
    ]);

    return {
      organizationName: org?.name ?? '',
      counts: {
        alternants: alternants.length,
        members: members.length,
        entreprises: entreprises.length,
        promotions: promotions.length,
      },
    };
  }

  async listAlternants(user: AuthUser) {
    const orgId = await this.resolveOrg(user);
    const profils = await this.db
      .select()
      .from(schema.alternantProfil)
      .where(eq(schema.alternantProfil.organizationId, orgId));
    if (profils.length === 0) return [];

    const profilIds = profils.map((p) => p.id);
    const promotionIds = profils.map((p) => p.promotionId).filter(Boolean) as string[];

    const associations = await this.db
      .select()
      .from(schema.association)
      .where(inArray(schema.association.alternantProfilId, profilIds));
    const assocByProfil = new Map(associations.map((a) => [a.alternantProfilId, a]));

    const promotions = promotionIds.length
      ? await this.db
          .select({ id: schema.promotion.id, name: schema.promotion.name })
          .from(schema.promotion)
          .where(inArray(schema.promotion.id, promotionIds))
      : [];
    const promoById = new Map(promotions.map((p) => [p.id, p.name]));

    const entrepriseIds = associations.map((a) => a.entrepriseId).filter(Boolean) as string[];
    const entreprises = entrepriseIds.length
      ? await this.db
          .select({ id: schema.entreprise.id, name: schema.entreprise.name })
          .from(schema.entreprise)
          .where(inArray(schema.entreprise.id, entrepriseIds))
      : [];
    const entrepriseById = new Map(entreprises.map((e) => [e.id, e.name]));

    const userIds = [
      ...new Set([
        ...profils.map((p) => p.userId),
        ...associations.flatMap((a) => [a.tuteurPedaUserId, a.tuteurEntrepriseUserId]),
      ]),
    ].filter(Boolean) as string[];
    const users = userIds.length
      ? await this.db
          .select({ id: schema.user.id, name: schema.user.name, email: schema.user.email })
          .from(schema.user)
          .where(inArray(schema.user.id, userIds))
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    return profils.map((p) => {
      const assoc = assocByProfil.get(p.id);
      return {
        alternantProfilId: p.id,
        name: userById.get(p.userId)?.name ?? null,
        email: userById.get(p.userId)?.email ?? null,
        promotionName: p.promotionId ? (promoById.get(p.promotionId) ?? null) : null,
        entrepriseName: assoc?.entrepriseId
          ? (entrepriseById.get(assoc.entrepriseId) ?? null)
          : null,
        tuteurPedaName: assoc?.tuteurPedaUserId
          ? (userById.get(assoc.tuteurPedaUserId)?.name ?? null)
          : null,
        tuteurEntrepriseName: assoc?.tuteurEntrepriseUserId
          ? (userById.get(assoc.tuteurEntrepriseUserId)?.name ?? null)
          : null,
      };
    });
  }

  async listMembers(user: AuthUser) {
    const orgId = await this.resolveOrg(user);
    return this.db
      .select({
        id: schema.member.id,
        role: schema.member.role,
        name: schema.user.name,
        email: schema.user.email,
      })
      .from(schema.member)
      .leftJoin(schema.user, eq(schema.user.id, schema.member.userId))
      .where(eq(schema.member.organizationId, orgId))
      .orderBy(asc(schema.member.role));
  }

  async listEntreprises(user: AuthUser) {
    const orgId = await this.resolveOrg(user);
    return this.db
      .select()
      .from(schema.entreprise)
      .where(eq(schema.entreprise.organizationId, orgId))
      .orderBy(asc(schema.entreprise.name));
  }

  async createEntreprise(user: AuthUser, input: { name: string; sector?: string; city?: string }) {
    const orgId = await this.resolveOrg(user);
    const [created] = await this.db
      .insert(schema.entreprise)
      .values({
        organizationId: orgId,
        name: input.name,
        sector: input.sector ?? null,
        city: input.city ?? null,
      })
      .returning();
    return created;
  }

  async deleteEntreprise(user: AuthUser, entrepriseId: string) {
    const orgId = await this.resolveOrg(user);
    const [existing] = await this.db
      .select()
      .from(schema.entreprise)
      .where(
        and(eq(schema.entreprise.id, entrepriseId), eq(schema.entreprise.organizationId, orgId)),
      );
    if (!existing) throw new NotFoundException('Entreprise introuvable');
    await this.db.delete(schema.entreprise).where(eq(schema.entreprise.id, entrepriseId));
    return { id: entrepriseId };
  }

  async listPromotions(user: AuthUser) {
    const orgId = await this.resolveOrg(user);
    return this.db
      .select()
      .from(schema.promotion)
      .where(eq(schema.promotion.organizationId, orgId))
      .orderBy(asc(schema.promotion.name));
  }

  async createPromotion(
    user: AuthUser,
    input: { name: string; rncpLevel?: number; periodStart?: string; periodEnd?: string },
  ) {
    const orgId = await this.resolveOrg(user);
    const [created] = await this.db
      .insert(schema.promotion)
      .values({
        organizationId: orgId,
        name: input.name,
        rncpLevel: input.rncpLevel ?? null,
        periodStart: input.periodStart ?? null,
        periodEnd: input.periodEnd ?? null,
      })
      .returning();
    return created;
  }
}
