import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { schema, type CompetenceLevel, type EvaluatorRole } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import type { AuthUser } from '../auth/auth.types';

export interface CompetenceView {
  id: string;
  code: string | null;
  label: string;
  evaluations: Partial<Record<EvaluatorRole, CompetenceLevel>>;
}

export interface BlocView {
  id: string;
  code: string;
  label: string;
  competences: CompetenceView[];
}

export interface AlternantCompetencesView {
  alternantProfilId: string;
  referentiel: { id: string; code: string; title: string } | null;
  /** The evaluator role the current user may edit, if any (else read-only). */
  editableAs: EvaluatorRole | null;
  blocs: BlocView[];
}

interface Access {
  canRead: boolean;
  editableAs: EvaluatorRole | null;
}

@Injectable()
export class CompetencesService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  /** Resolve the current user's relationship to an apprentice profile. */
  private async resolveAccess(user: AuthUser, alternantProfilId: string): Promise<Access> {
    const [profil] = await this.db
      .select()
      .from(schema.alternantProfil)
      .where(eq(schema.alternantProfil.id, alternantProfilId));
    if (!profil) throw new NotFoundException('Alternant introuvable');

    if (profil.userId === user.id) return { canRead: true, editableAs: 'auto' };

    const [assoc] = await this.db
      .select()
      .from(schema.association)
      .where(eq(schema.association.alternantProfilId, alternantProfilId));

    if (assoc?.tuteurPedaUserId === user.id) return { canRead: true, editableAs: 'peda' };
    if (assoc?.tuteurEntrepriseUserId === user.id)
      return { canRead: true, editableAs: 'entreprise' };

    // Platform roles read everything (no edit rights on evaluations).
    if (user.role === 'super_admin' || user.role === 'support') {
      return { canRead: true, editableAs: null };
    }

    // Establishment admins read their own org's apprentices.
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
    if (membership) return { canRead: true, editableAs: null };

    throw new ForbiddenException('Accès non autorisé à cet alternant');
  }

  async getAlternantCompetences(
    user: AuthUser,
    alternantProfilId: string,
  ): Promise<AlternantCompetencesView> {
    const access = await this.resolveAccess(user, alternantProfilId);

    const [profil] = await this.db
      .select()
      .from(schema.alternantProfil)
      .where(eq(schema.alternantProfil.id, alternantProfilId));

    // Referentiel via the apprentice's promotion.
    let referentiel: AlternantCompetencesView['referentiel'] = null;
    let blocs: BlocView[] = [];

    if (profil?.promotionId) {
      const [promo] = await this.db
        .select()
        .from(schema.promotion)
        .where(eq(schema.promotion.id, profil.promotionId));

      if (promo?.referentielId) {
        const [ref] = await this.db
          .select()
          .from(schema.referentiel)
          .where(eq(schema.referentiel.id, promo.referentielId));
        if (ref) referentiel = { id: ref.id, code: ref.code, title: ref.title };

        const blocRows = await this.db
          .select()
          .from(schema.bloc)
          .where(eq(schema.bloc.referentielId, promo.referentielId))
          .orderBy(schema.bloc.position);

        const blocIds = blocRows.map((b) => b.id);
        const compRows = blocIds.length
          ? await this.db
              .select()
              .from(schema.competence)
              .where(inArray(schema.competence.blocId, blocIds))
              .orderBy(schema.competence.position)
          : [];

        const evalRows = await this.db
          .select()
          .from(schema.evaluation)
          .where(eq(schema.evaluation.alternantProfilId, alternantProfilId));

        const evalByCompetence = new Map<string, Partial<Record<EvaluatorRole, CompetenceLevel>>>();
        for (const e of evalRows) {
          const entry = evalByCompetence.get(e.competenceId) ?? {};
          entry[e.evaluator] = e.level;
          evalByCompetence.set(e.competenceId, entry);
        }

        blocs = blocRows.map((b) => ({
          id: b.id,
          code: b.code,
          label: b.label,
          competences: compRows
            .filter((c) => c.blocId === b.id)
            .map((c) => ({
              id: c.id,
              code: c.code,
              label: c.label,
              evaluations: evalByCompetence.get(c.id) ?? {},
            })),
        }));
      }
    }

    return { alternantProfilId, referentiel, editableAs: access.editableAs, blocs };
  }

  async setEvaluation(
    user: AuthUser,
    alternantProfilId: string,
    competenceId: string,
    level: CompetenceLevel,
  ): Promise<{ competenceId: string; evaluator: EvaluatorRole; level: CompetenceLevel }> {
    const access = await this.resolveAccess(user, alternantProfilId);
    if (!access.editableAs) {
      throw new ForbiddenException("Vous n'avez pas le droit d'évaluer cet alternant");
    }

    // Ensure the competence belongs to this apprentice's referentiel.
    const view = await this.getAlternantCompetences(user, alternantProfilId);
    const exists = view.blocs.some((b) => b.competences.some((c) => c.id === competenceId));
    if (!exists) throw new NotFoundException('Compétence hors référentiel de cet alternant');

    const evaluator = access.editableAs;
    await this.db
      .insert(schema.evaluation)
      .values({ alternantProfilId, competenceId, evaluator, level })
      .onConflictDoUpdate({
        target: [
          schema.evaluation.alternantProfilId,
          schema.evaluation.competenceId,
          schema.evaluation.evaluator,
        ],
        set: { level, updatedAt: new Date() },
      });

    return { competenceId, evaluator, level };
  }

  /** The current user's own apprentice profile id, if they are an alternant. */
  async getMyAlternantProfileId(user: AuthUser): Promise<string | null> {
    const [profil] = await this.db
      .select({ id: schema.alternantProfil.id })
      .from(schema.alternantProfil)
      .where(eq(schema.alternantProfil.userId, user.id));
    return profil?.id ?? null;
  }
}
