import { Injectable } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import { schema, type EvaluatorRole } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import type { AuthUser } from '../auth/auth.types';

export interface TutorAlternant {
  alternantProfilId: string;
  name: string;
  email: string;
  promotionName: string | null;
  entrepriseName: string | null;
  myRole: Extract<EvaluatorRole, 'peda' | 'entreprise'>;
  progress: { evaluated: number; total: number };
}

@Injectable()
export class AlternantsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  /** Apprentices the current user supervises as tuteur pédagogique or d'entreprise. */
  async listForTutor(user: AuthUser): Promise<TutorAlternant[]> {
    const rows = await this.db
      .select({
        alternantProfilId: schema.alternantProfil.id,
        name: schema.user.name,
        email: schema.user.email,
        promotionName: schema.promotion.name,
        referentielId: schema.promotion.referentielId,
        entrepriseName: schema.entreprise.name,
        tuteurPedaUserId: schema.association.tuteurPedaUserId,
      })
      .from(schema.association)
      .innerJoin(
        schema.alternantProfil,
        eq(schema.alternantProfil.id, schema.association.alternantProfilId),
      )
      .innerJoin(schema.user, eq(schema.user.id, schema.alternantProfil.userId))
      .leftJoin(schema.promotion, eq(schema.promotion.id, schema.alternantProfil.promotionId))
      .leftJoin(schema.entreprise, eq(schema.entreprise.id, schema.association.entrepriseId))
      .where(
        or(
          eq(schema.association.tuteurPedaUserId, user.id),
          eq(schema.association.tuteurEntrepriseUserId, user.id),
        ),
      );

    const result: TutorAlternant[] = [];
    for (const row of rows) {
      const myRole: 'peda' | 'entreprise' =
        row.tuteurPedaUserId === user.id ? 'peda' : 'entreprise';
      const progress = await this.progressFor(row.alternantProfilId, row.referentielId, myRole);
      result.push({
        alternantProfilId: row.alternantProfilId,
        name: row.name,
        email: row.email,
        promotionName: row.promotionName,
        entrepriseName: row.entrepriseName,
        myRole,
        progress,
      });
    }
    return result;
  }

  /** Number of competences evaluated by `evaluator` over the total of the referentiel. */
  private async progressFor(
    alternantProfilId: string,
    referentielId: string | null,
    evaluator: EvaluatorRole,
  ): Promise<{ evaluated: number; total: number }> {
    if (!referentielId) return { evaluated: 0, total: 0 };

    const totalRows = await this.db
      .select({ id: schema.competence.id })
      .from(schema.competence)
      .innerJoin(schema.bloc, eq(schema.bloc.id, schema.competence.blocId))
      .where(eq(schema.bloc.referentielId, referentielId));

    const evaluatedRows = await this.db
      .select({ id: schema.evaluation.id })
      .from(schema.evaluation)
      .where(
        and(
          eq(schema.evaluation.alternantProfilId, alternantProfilId),
          eq(schema.evaluation.evaluator, evaluator),
        ),
      );

    return { evaluated: evaluatedRows.length, total: totalRows.length };
  }
}
