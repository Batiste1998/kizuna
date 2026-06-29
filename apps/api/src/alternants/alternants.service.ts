import { Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, or } from 'drizzle-orm';
import { schema, type EvaluatorRole } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import type { AuthUser } from '../auth/auth.types';

export interface TutorAlternant {
  alternantProfilId: string;
  name: string;
  email: string;
  promotionName: string | null;
  entrepriseName: string | null;
  tuteurPedaName: string | null;
  tuteurEntrepriseName: string | null;
  myRole: Extract<EvaluatorRole, 'peda' | 'entreprise'>;
  progress: { evaluated: number; total: number };
}

export interface AlternantDashboard {
  titleName: string;
  progressionPct: number;
  blocs: { validated: number; total: number };
  competences: { acquired: number; total: number };
  toSelfEvaluate: number;
  trinome: { peda: string | null; entrepriseTutor: string | null; entreprise: string | null };
  nextBilan: { label: string; scheduledAt: Date } | null;
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
        tuteurEntrepriseUserId: schema.association.tuteurEntrepriseUserId,
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

    // Resolve both tutors' display names in one round-trip, so the apprentice's
    // file shows the full trinôme whoever is looking at it.
    const tutorIds = [
      ...new Set(
        rows.flatMap((r) => [r.tuteurPedaUserId, r.tuteurEntrepriseUserId]).filter(Boolean),
      ),
    ] as string[];
    const tutorNames = new Map<string, string>();
    if (tutorIds.length) {
      const users = await this.db
        .select({ id: schema.user.id, name: schema.user.name })
        .from(schema.user)
        .where(inArray(schema.user.id, tutorIds));
      for (const u of users) tutorNames.set(u.id, u.name);
    }

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
        tuteurPedaName: tutorNames.get(row.tuteurPedaUserId ?? '') ?? null,
        tuteurEntrepriseName: tutorNames.get(row.tuteurEntrepriseUserId ?? '') ?? null,
        myRole,
        progress,
      });
    }
    return result;
  }

  /** Tutor dashboard: supervised apprentices (with "to evaluate") + upcoming bilans. */
  async tutorDashboard(user: AuthUser) {
    const alternants = await this.listForTutor(user);
    const withToEvaluate = alternants.map((a) => ({
      ...a,
      toEvaluate: Math.max(0, a.progress.total - a.progress.evaluated),
    }));
    const ids = alternants.map((a) => a.alternantProfilId);
    let upcomingBilans = 0;
    if (ids.length) {
      const rows = await this.db
        .select({ id: schema.bilan.id })
        .from(schema.bilan)
        .where(
          and(
            inArray(schema.bilan.alternantProfilId, ids),
            eq(schema.bilan.status, 'planned'),
            gte(schema.bilan.scheduledAt, new Date()),
          ),
        );
      upcomingBilans = rows.length;
    }
    return { alternants: withToEvaluate, upcomingBilans };
  }

  /** Self dashboard for the logged-in apprentice. */
  async alternantDashboard(user: AuthUser): Promise<AlternantDashboard | null> {
    const [profil] = await this.db
      .select({ id: schema.alternantProfil.id, promotionId: schema.alternantProfil.promotionId })
      .from(schema.alternantProfil)
      .where(eq(schema.alternantProfil.userId, user.id))
      .limit(1);
    if (!profil) return null;

    let referentielId: string | null = null;
    let titleName = '';
    if (profil.promotionId) {
      const [promo] = await this.db
        .select({ referentielId: schema.promotion.referentielId })
        .from(schema.promotion)
        .where(eq(schema.promotion.id, profil.promotionId));
      referentielId = promo?.referentielId ?? null;
    }
    if (referentielId) {
      const [ref] = await this.db
        .select({ title: schema.referentiel.title })
        .from(schema.referentiel)
        .where(eq(schema.referentiel.id, referentielId));
      titleName = ref?.title ?? '';
    }

    let blocsTotal = 0;
    let blocsValidated = 0;
    let total = 0;
    let acquired = 0;
    let evaluatedAuto = 0;
    if (referentielId) {
      const comps = await this.db
        .select({ id: schema.competence.id, blocId: schema.competence.blocId })
        .from(schema.competence)
        .innerJoin(schema.bloc, eq(schema.bloc.id, schema.competence.blocId))
        .where(eq(schema.bloc.referentielId, referentielId));
      total = comps.length;
      const autoEvals = await this.db
        .select({ competenceId: schema.evaluation.competenceId, level: schema.evaluation.level })
        .from(schema.evaluation)
        .where(
          and(
            eq(schema.evaluation.alternantProfilId, profil.id),
            eq(schema.evaluation.evaluator, 'auto'),
          ),
        );
      const levelByComp = new Map(autoEvals.map((e) => [e.competenceId, e.level]));
      const compsByBloc = new Map<string, string[]>();
      for (const c of comps) {
        const lvl = levelByComp.get(c.id);
        if (lvl && lvl !== 'NA') evaluatedAuto++;
        if (lvl === 'A' || lvl === 'M') acquired++;
        const arr = compsByBloc.get(c.blocId) ?? [];
        arr.push(c.id);
        compsByBloc.set(c.blocId, arr);
      }
      blocsTotal = compsByBloc.size;
      for (const ids of compsByBloc.values()) {
        if (ids.length && ids.every((id) => ['A', 'M'].includes(levelByComp.get(id) ?? ''))) {
          blocsValidated++;
        }
      }
    }

    const [assoc] = await this.db
      .select()
      .from(schema.association)
      .where(eq(schema.association.alternantProfilId, profil.id));
    let peda: string | null = null;
    let entrepriseTutor: string | null = null;
    let entreprise: string | null = null;
    if (assoc) {
      const ids = [assoc.tuteurPedaUserId, assoc.tuteurEntrepriseUserId].filter(Boolean) as string[];
      if (ids.length) {
        const us = await this.db
          .select({ id: schema.user.id, name: schema.user.name })
          .from(schema.user)
          .where(inArray(schema.user.id, ids));
        const byId = new Map(us.map((u) => [u.id, u.name]));
        peda = assoc.tuteurPedaUserId ? (byId.get(assoc.tuteurPedaUserId) ?? null) : null;
        entrepriseTutor = assoc.tuteurEntrepriseUserId
          ? (byId.get(assoc.tuteurEntrepriseUserId) ?? null)
          : null;
      }
      if (assoc.entrepriseId) {
        const [e] = await this.db
          .select({ name: schema.entreprise.name })
          .from(schema.entreprise)
          .where(eq(schema.entreprise.id, assoc.entrepriseId));
        entreprise = e?.name ?? null;
      }
    }

    const [nextBilan] = await this.db
      .select({ label: schema.bilan.label, scheduledAt: schema.bilan.scheduledAt })
      .from(schema.bilan)
      .where(
        and(
          eq(schema.bilan.alternantProfilId, profil.id),
          eq(schema.bilan.status, 'planned'),
          gte(schema.bilan.scheduledAt, new Date()),
        ),
      )
      .orderBy(schema.bilan.scheduledAt)
      .limit(1);

    return {
      titleName,
      progressionPct: total > 0 ? Math.round((acquired / total) * 100) : 0,
      blocs: { validated: blocsValidated, total: blocsTotal },
      competences: { acquired, total },
      toSelfEvaluate: total - evaluatedAuto,
      trinome: { peda, entrepriseTutor, entreprise },
      nextBilan: nextBilan ?? null,
    };
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
