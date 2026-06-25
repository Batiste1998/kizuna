import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { schema, type EvaluatorRole } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import type { AuthUser } from '../auth/auth.types';

type AlternantProfil = typeof schema.alternantProfil.$inferSelect;
type Association = typeof schema.association.$inferSelect;

export type AlternantRelation = 'alternant' | 'peda' | 'entreprise' | 'admin' | 'platform';

export interface AlternantAccess {
  profil: AlternantProfil;
  association: Association | null;
  /** The user's relation to this apprentice. */
  relation: AlternantRelation;
  /** Evaluator role the user may act as (auto/peda/entreprise), or null if read-only. */
  editableAs: EvaluatorRole | null;
  /** True for tutors and establishment admins (may manage bilans, etc.). */
  canManage: boolean;
}

/**
 * Centralises authorization around an apprentice (trinôme + platform/admin roles).
 * Shared by the competences and journal modules.
 */
@Injectable()
export class AccessService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async resolveAlternantAccess(
    user: AuthUser,
    alternantProfilId: string,
  ): Promise<AlternantAccess> {
    const [profil] = await this.db
      .select()
      .from(schema.alternantProfil)
      .where(eq(schema.alternantProfil.id, alternantProfilId));
    if (!profil) throw new NotFoundException('Alternant introuvable');

    const [association] = await this.db
      .select()
      .from(schema.association)
      .where(eq(schema.association.alternantProfilId, alternantProfilId));

    if (profil.userId === user.id)
      return {
        profil,
        association: association ?? null,
        relation: 'alternant',
        editableAs: 'auto',
        canManage: false,
      };
    if (association?.tuteurPedaUserId === user.id)
      return { profil, association, relation: 'peda', editableAs: 'peda', canManage: true };
    if (association?.tuteurEntrepriseUserId === user.id)
      return {
        profil,
        association,
        relation: 'entreprise',
        editableAs: 'entreprise',
        canManage: true,
      };

    // Platform roles read everything (no edit rights).
    if (user.role === 'super_admin' || user.role === 'support') {
      return {
        profil,
        association: association ?? null,
        relation: 'platform',
        editableAs: null,
        canManage: false,
      };
    }

    // Establishment admins manage their own org's apprentices.
    const [membership] = await this.db
      .select()
      .from(schema.member)
      .where(
        and(
          eq(schema.member.organizationId, profil.organizationId),
          eq(schema.member.userId, user.id),
          eq(schema.member.role, 'admin'),
        ),
      );
    if (membership)
      return {
        profil,
        association: association ?? null,
        relation: 'admin',
        editableAs: null,
        canManage: true,
      };

    throw new ForbiddenException('Accès non autorisé à cet alternant');
  }

  async getMyAlternantProfileId(user: AuthUser): Promise<string | null> {
    const [profil] = await this.db
      .select({ id: schema.alternantProfil.id })
      .from(schema.alternantProfil)
      .where(eq(schema.alternantProfil.userId, user.id));
    return profil?.id ?? null;
  }
}
