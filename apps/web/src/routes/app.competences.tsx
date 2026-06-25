import { useEffect, useState, type ReactNode } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useSession } from '#/lib/auth-client';
import {
  api,
  type AlternantCompetences,
  type CompetenceLevel,
  type EvaluatorRole,
} from '#/lib/api';
import { EVALUATOR_LABELS, LEVELS, LEVEL_BY_KEY } from '#/lib/levels';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/app/competences')({
  component: CompetencesPage,
});

const COLUMNS: EvaluatorRole[] = ['auto', 'peda', 'entreprise'];

/** Immutably set a competence's level for a given evaluator column. */
function applyLevel(
  data: AlternantCompetences,
  competenceId: string,
  role: EvaluatorRole,
  level: CompetenceLevel,
): AlternantCompetences {
  return {
    ...data,
    blocs: data.blocs.map((bloc) => ({
      ...bloc,
      competences: bloc.competences.map((comp) =>
        comp.id === competenceId
          ? { ...comp, evaluations: { ...comp.evaluations, [role]: level } }
          : comp,
      ),
    })),
  };
}

function CompetencesPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState<AlternantCompetences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError(null);
    api
      .myAlternantProfile()
      .then((p) => api.getCompetences(p.alternantProfilId))
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session]);

  async function setLevel(competenceId: string, level: CompetenceLevel) {
    if (!data?.editableAs) return;
    const role = data.editableAs;
    const previous = data;
    setData(applyLevel(data, competenceId, role, level));
    try {
      await api.setEvaluation(data.alternantProfilId, competenceId, level);
      toast.success('Évaluation enregistrée');
    } catch (e) {
      setData(previous);
      toast.error((e as Error).message);
    }
  }

  if (isPending || (loading && session)) {
    return <Centered>Chargement…</Centered>;
  }
  if (!session) return null;
  if (error) {
    return (
      <Centered>
        <div className="text-center">
          <p className="font-medium">{error}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cet espace cible le suivi d’un alternant. Connectez-vous avec un compte alternant.
          </p>
          <Link to="/app" className="mt-4 inline-block text-sm text-brand hover:underline">
            ← Retour
          </Link>
        </div>
      </Centered>
    );
  }
  if (!data) return null;

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <Link to="/app" className="text-xs text-muted-foreground hover:text-brand">
              ← Espace
            </Link>
            <h1 className="text-lg font-bold tracking-tight">Mes compétences</h1>
            {data.referentiel && (
              <p className="text-xs text-muted-foreground">
                {data.referentiel.title} ·{' '}
                <span className="font-mono">{data.referentiel.code}</span>
              </p>
            )}
          </div>
          <LegendRow editableAs={data.editableAs} />
        </div>
      </header>

      <section className="mx-auto max-w-4xl space-y-5 px-6 py-8">
        {data.blocs.map((bloc) => (
          <div key={bloc.id} className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <span className="rounded-md bg-brand-soft px-2 py-0.5 font-mono text-xs font-semibold text-brand-strong">
                {bloc.code}
              </span>
              <h2 className="text-sm font-semibold">{bloc.label}</h2>
            </div>

            <div className="divide-y divide-border">
              <div className="hidden grid-cols-[1fr_repeat(3,7rem)] gap-2 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
                <span>Compétence</span>
                {COLUMNS.map((c) => (
                  <span key={c} className="text-center">
                    {EVALUATOR_LABELS[c]}
                  </span>
                ))}
              </div>

              {bloc.competences.map((comp) => (
                <div
                  key={comp.id}
                  className="grid grid-cols-1 gap-2 px-5 py-3 sm:grid-cols-[1fr_repeat(3,7rem)] sm:items-center"
                >
                  <span className="text-sm">{comp.label}</span>
                  {COLUMNS.map((col) => (
                    <div key={col} className="flex justify-center">
                      {col === data.editableAs ? (
                        <LevelPicker
                          value={comp.evaluations[col]}
                          onChange={(lvl) => setLevel(comp.id, lvl)}
                        />
                      ) : (
                        <LevelBadge value={comp.evaluations[col]} />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

function LevelBadge({ value }: { value?: CompetenceLevel }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  const lvl = LEVEL_BY_KEY[value];
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', lvl.className)}>
      {lvl.short}
    </span>
  );
}

function LevelPicker({
  value,
  onChange,
}: {
  value?: CompetenceLevel;
  onChange: (level: CompetenceLevel) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border">
      {LEVELS.map((lvl) => (
        <button
          key={lvl.key}
          type="button"
          onClick={() => onChange(lvl.key)}
          title={lvl.label}
          className={cn(
            'px-2 py-1 text-xs font-semibold transition-colors',
            value === lvl.key ? lvl.className : 'bg-card text-muted-foreground hover:bg-accent',
          )}
        >
          {lvl.short}
        </button>
      ))}
    </div>
  );
}

function LegendRow({ editableAs }: { editableAs: EvaluatorRole | null }) {
  return (
    <div className="hidden text-right sm:block">
      <div className="flex items-center gap-1.5">
        {LEVELS.map((lvl) => (
          <span
            key={lvl.key}
            className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', lvl.className)}
          >
            {lvl.short}
          </span>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {editableAs ? `Vous évaluez : ${EVALUATOR_LABELS[editableAs]}` : 'Lecture seule'}
      </p>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center text-muted-foreground">{children}</main>
  );
}
