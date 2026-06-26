import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  api,
  type AlternantCompetences,
  type CompetenceLevel,
  type EvaluatorRole,
} from '#/lib/api';
import { EVALUATOR_LABELS, LEVELS, LEVEL_BY_KEY } from '#/lib/levels';
import { cn } from '#/lib/utils';

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

/** Tri-evaluation grid for one apprentice; editable column depends on the viewer's role. */
export function CompetencesPanel({ alternantProfilId }: { alternantProfilId: string }) {
  const [data, setData] = useState<AlternantCompetences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getCompetences(alternantProfilId)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [alternantProfilId]);

  async function setLevel(competenceId: string, level: CompetenceLevel) {
    if (!data?.editableAs) return;
    const role = data.editableAs;
    const previous = data;
    setData(applyLevel(data, competenceId, role, level));
    try {
      await api.setEvaluation(alternantProfilId, competenceId, level);
      toast.success('Évaluation enregistrée');
    } catch (e) {
      setData(previous);
      toast.error((e as Error).message);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {data.referentiel && (
          <p className="text-xs text-muted-foreground">
            {data.referentiel.title} · <span className="font-mono">{data.referentiel.code}</span>
          </p>
        )}
        <div className="flex items-center gap-3">
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
          <span className="text-[11px] text-muted-foreground">
            {data.editableAs
              ? `Vous évaluez : ${EVALUATOR_LABELS[data.editableAs]}`
              : 'Lecture seule'}
          </span>
        </div>
      </div>

      {data.blocs.map((bloc) => (
        <div key={bloc.id} className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <span className="rounded-md bg-brand-soft px-2 py-0.5 font-mono text-xs font-semibold text-brand-strong">
              {bloc.code}
            </span>
            <h2 className="text-sm font-semibold">{bloc.label}</h2>
          </div>

          <div className="divide-y divide-border">
            <div className="hidden grid-cols-[1fr_repeat(3,7rem)] gap-2 px-5 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:grid">
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
    </div>
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
            'min-w-[2.25rem] px-2 py-1 text-center text-xs font-semibold transition-colors',
            value === lvl.key ? lvl.className : 'bg-card text-muted-foreground hover:bg-accent',
          )}
        >
          {lvl.short}
        </button>
      ))}
    </div>
  );
}
