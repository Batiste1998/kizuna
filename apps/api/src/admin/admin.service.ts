import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { schema } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import { AUTH } from '../auth/auth.constants';
import type { Auth } from '../auth/auth';
import type { AuthUser } from '../auth/auth.types';
import type { CreatableMemberRole } from '@kizuna/shared';

export interface AdminOverview {
  organizationName: string;
  counts: { alternants: number; members: number; entreprises: number; promotions: number };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(AUTH) private readonly auth: Auth,
  ) {}

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
        userId: schema.member.userId,
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

  /**
   * Onboards a member into the admin's establishment. Creates the user account
   * if the email is unknown (returning a temporary password until email-based
   * invitations are wired), ensures a member row with the requested role, and
   * provisions the apprentice profile when role === 'alternant'.
   */
  async createMember(
    user: AuthUser,
    input: { name: string; email: string; role: CreatableMemberRole; promotionId?: string },
  ) {
    const orgId = await this.resolveOrg(user);

    const [existingUser] = await this.db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, input.email));

    let userId = existingUser?.id;
    let temporaryPassword: string | null = null;
    if (!userId) {
      temporaryPassword = `Kz-${randomBytes(12).toString('base64url')}`;
      const res = await this.auth.api.signUpEmail({
        body: { name: input.name, email: input.email, password: temporaryPassword },
      });
      userId = res.user.id;
    }

    const [existingMember] = await this.db
      .select()
      .from(schema.member)
      .where(and(eq(schema.member.organizationId, orgId), eq(schema.member.userId, userId)));
    if (!existingMember) {
      await this.db
        .insert(schema.member)
        .values({ id: randomUUID(), organizationId: orgId, userId, role: input.role });
    } else if (existingMember.role !== input.role) {
      await this.db
        .update(schema.member)
        .set({ role: input.role })
        .where(eq(schema.member.id, existingMember.id));
    }

    let alternantProfilId: string | null = null;
    if (input.role === 'alternant') {
      const promotionId = await this.assertPromotionInOrg(orgId, input.promotionId);
      const [profil] = await this.db
        .select()
        .from(schema.alternantProfil)
        .where(
          and(
            eq(schema.alternantProfil.userId, userId),
            eq(schema.alternantProfil.organizationId, orgId),
          ),
        );
      if (profil) {
        alternantProfilId = profil.id;
        if (promotionId && profil.promotionId !== promotionId) {
          await this.db
            .update(schema.alternantProfil)
            .set({ promotionId })
            .where(eq(schema.alternantProfil.id, profil.id));
        }
      } else {
        const [created] = await this.db
          .insert(schema.alternantProfil)
          .values({ userId, organizationId: orgId, promotionId })
          .returning();
        alternantProfilId = created.id;
      }
    }

    return { userId, role: input.role, alternantProfilId, temporaryPassword };
  }

  /** Creates or updates the trinôme (tuteurs + entreprise) of an apprentice. */
  async upsertAssociation(
    user: AuthUser,
    alternantProfilId: string,
    input: { tuteurPedaUserId?: string; tuteurEntrepriseUserId?: string; entrepriseId?: string },
  ) {
    const orgId = await this.resolveOrg(user);
    const [profil] = await this.db
      .select({ id: schema.alternantProfil.id })
      .from(schema.alternantProfil)
      .where(
        and(
          eq(schema.alternantProfil.id, alternantProfilId),
          eq(schema.alternantProfil.organizationId, orgId),
        ),
      );
    if (!profil) throw new NotFoundException('Alternant introuvable');

    const tuteurPedaUserId = await this.assertMemberInOrg(orgId, input.tuteurPedaUserId);
    const tuteurEntrepriseUserId = await this.assertMemberInOrg(orgId, input.tuteurEntrepriseUserId);
    const entrepriseId = await this.assertEntrepriseInOrg(orgId, input.entrepriseId);

    const [existing] = await this.db
      .select()
      .from(schema.association)
      .where(eq(schema.association.alternantProfilId, alternantProfilId));

    if (existing) {
      const [updated] = await this.db
        .update(schema.association)
        .set({
          tuteurPedaUserId:
            input.tuteurPedaUserId !== undefined ? tuteurPedaUserId : existing.tuteurPedaUserId,
          tuteurEntrepriseUserId:
            input.tuteurEntrepriseUserId !== undefined
              ? tuteurEntrepriseUserId
              : existing.tuteurEntrepriseUserId,
          entrepriseId: input.entrepriseId !== undefined ? entrepriseId : existing.entrepriseId,
        })
        .where(eq(schema.association.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(schema.association)
      .values({ alternantProfilId, tuteurPedaUserId, tuteurEntrepriseUserId, entrepriseId })
      .returning();
    return created;
  }

  private async assertPromotionInOrg(
    orgId: string,
    promotionId?: string | null,
  ): Promise<string | null> {
    if (!promotionId) return null;
    const [promo] = await this.db
      .select({ id: schema.promotion.id })
      .from(schema.promotion)
      .where(
        and(eq(schema.promotion.id, promotionId), eq(schema.promotion.organizationId, orgId)),
      );
    if (!promo) throw new NotFoundException('Promotion introuvable');
    return promotionId;
  }

  private async assertMemberInOrg(
    orgId: string,
    userId?: string | null,
  ): Promise<string | null> {
    if (!userId) return null;
    const [member] = await this.db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(and(eq(schema.member.organizationId, orgId), eq(schema.member.userId, userId)));
    if (!member) throw new NotFoundException('Tuteur introuvable dans l’établissement');
    return userId;
  }

  private async assertEntrepriseInOrg(
    orgId: string,
    entrepriseId?: string | null,
  ): Promise<string | null> {
    if (!entrepriseId) return null;
    const [entreprise] = await this.db
      .select({ id: schema.entreprise.id })
      .from(schema.entreprise)
      .where(
        and(eq(schema.entreprise.id, entrepriseId), eq(schema.entreprise.organizationId, orgId)),
      );
    if (!entreprise) throw new NotFoundException('Entreprise introuvable');
    return entrepriseId;
  }
}
