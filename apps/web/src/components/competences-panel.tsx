import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { EVALUATOR_ROLES } from '@kizuna/shared';
import {
  api,
  type AlternantCompetences,
  type CompetenceLevel,
  type CompetenceView,
  type EvaluatorRole,
} from '#/lib/api';
import { EVALUATOR_VOICE_COLORS, EVALUATOR_VOICE_LABELS, LEVELS } from '#/lib/levels';
import { isDemoAccount } from '#/lib/roles';
import { useMaybeMe } from '#/lib/me-context';
import { cn } from '#/lib/utils';
import { Coachmark, useCoachmark } from './coachmark';
import { ThreadSkeleton } from './ui/skeleton';

/* -------------------------------------------------------------------------- *
 * Le fil à trois voix (絆)
 * Each competence is a single progression thread — Non acquis → Maîtrisé — on
 * which three beads are strung: the trinôme (auto, école, entreprise). You read
 * how far the competence has come (position) and whether the three voices agree
 * (clustered or scattered) in one glance.
 * -------------------------------------------------------------------------- */

// Level order, index and labels all derive from the single source in lib/levels.
const LEVEL_ORDER = LEVELS.map((l) => l.key);
const LEVEL_INDEX = Object.fromEntries(LEVELS.map((l, i) => [l.key, i])) as Record<
  CompetenceLevel,
  number
>;
const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.key, l.label])) as Record<
  CompetenceLevel,
  string
>;

/** Glow ring under the editable bead, tinted with the voice's own colour. */
const editableGlow = (color: string) =>
  `0 0 0 3px var(--card), 0 4px 11px -2px color-mix(in srgb, ${color} 60%, transparent)`;

type VoiceMeta = { role: EvaluatorRole; label: string; color: string; glow: string };

/** The trinôme, in display order — colour identity and labels live in lib/levels. */
const VOICES: VoiceMeta[] = EVALUATOR_ROLES.map((role) => ({
  role,
  label: EVALUATOR_VOICE_LABELS[role],
  color: EVALUATOR_VOICE_COLORS[role].color,
  glow: editableGlow(EVALUATOR_VOICE_COLORS[role].color),
}));
const VOICE_BY_ROLE = Object.fromEntries(VOICES.map((v) => [v.role, v])) as Record<
  EvaluatorRole,
  VoiceMeta
>;

// Bead/track layout — single place to tune the thread visualisation.
const ANTECHAMBER = 34; // px strip at the rail's left for not-yet-evaluated beads
const WAITING_GAP = 11; // px between beads waiting in the antechamber
const CLUSTER_OFFSET = 5.5; // % spread when several beads land on the same level
const BEAD_SHADOW =
  '0 0 0 2.5px var(--card), 0 1px 2px rgba(20,23,33,0.04), 0 2px 6px rgba(20,23,33,0.05)';
const TRACK_FILL = `linear-gradient(90deg, color-mix(in srgb, var(--voice-auto) 10%, transparent), color-mix(in srgb, var(--voice-auto) 26%, transparent))`;

/** Centre of a level's zone, as a percentage of the track width. */
const levelCenter = (lvl: CompetenceLevel) => LEVEL_INDEX[lvl] * 25 + 12.5;

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

/** Highest level reached by any voice on a competence (drives the "achieved" fill). */
function topLevel(comp: CompetenceView): CompetenceLevel | null {
  let best: CompetenceLevel | null = null;
  for (const role of ['auto', 'peda', 'entreprise'] as const) {
    const lvl = comp.evaluations[role];
    if (lvl && (best === null || LEVEL_INDEX[lvl] > LEVEL_INDEX[best])) best = lvl;
  }
  return best;
}

/** Tri-evaluation thread for one apprentice; editable voice depends on the viewer. */
export function CompetencesPanel({ alternantProfilId }: { alternantProfilId: string }) {
  const [data, setData] = useState<AlternantCompetences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const me = useMaybeMe();
  const coach = useCoachmark('demo-tri-eval', isDemoAccount(me?.email));

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

  if (loading) return <ThreadSkeleton rows={4} />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return null;

  const editable = data.editableAs;

  return (
    <div className="space-y-5">
      {coach.open && (
        <Coachmark title="Le suivi à trois voix" onDismiss={coach.dismiss} className="w-full sm:max-w-md">
          Chaque compétence est un fil de progression — du <b>Non acquis</b> au <b>Maîtrisé</b> —
          sur lequel sont enfilées trois perles : l’alternant, le tuteur école et le tuteur
          entreprise. Voir converger ou diverger ces trois voix, c’est le cœur de Kizuna.
        </Coachmark>
      )}

      <Legend referentiel={data.referentiel} editable={editable} />

      {data.blocs.map((bloc) => (
        <BlocCard key={bloc.id} bloc={bloc} editable={editable} onSet={setLevel} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function LegendLabel({ children }: { children: ReactNode }) {
  return (
    <span className="min-w-[88px] text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </span>
  );
}

function Legend({
  referentiel,
  editable,
}: {
  referentiel: AlternantCompetences['referentiel'];
  editable: EvaluatorRole | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <LegendLabel>Les trois voix</LegendLabel>
        {VOICES.map((v) => (
          <span key={v.role} className="inline-flex items-center gap-2 text-[12.5px] font-medium">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: v.color }} />
            {v.label}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-strong">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          {editable ? `Vous évaluez : ${VOICE_BY_ROLE[editable].label}` : 'Lecture seule'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline pt-3">
        <LegendLabel>Échelle</LegendLabel>
        <span className="inline-flex items-center text-[11.5px] text-muted-foreground">
          {LEVEL_ORDER.map((lvl, i) => (
            <span key={lvl} className="inline-flex items-center">
              <span className={i === 0 || i === LEVEL_ORDER.length - 1 ? 'font-semibold text-foreground' : ''}>
                {LEVEL_LABEL[lvl]}
              </span>
              {i < LEVEL_ORDER.length - 1 && <span className="mx-2 opacity-40">→</span>}
            </span>
          ))}
        </span>
        {referentiel && (
          <span className="ml-auto text-[11px] text-muted-foreground">
            {referentiel.title} · <span className="font-mono">{referentiel.code}</span>
          </span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function BlocCard({
  bloc,
  editable,
  onSet,
}: {
  bloc: AlternantCompetences['blocs'][number];
  editable: EvaluatorRole | null;
  onSet: (competenceId: string, level: CompetenceLevel) => void;
}) {
  const tops = bloc.competences.map(topLevel);
  const acquired = tops.filter((t) => t && LEVEL_INDEX[t] >= LEVEL_INDEX.A).length;
  const total = bloc.competences.length || 1;
  const progress = Math.round(
    (tops.reduce((s, t) => s + (t ? LEVEL_INDEX[t] / 3 : 0), 0) / total) * 100,
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3.5 border-b border-hairline px-5 py-4">
        <span className="rounded-lg bg-brand-soft px-2.5 py-1 font-mono text-xs font-semibold text-brand-strong">
          {bloc.code}
        </span>
        <h2 className="flex-1 font-display text-base font-semibold tracking-[-0.01em]">{bloc.label}</h2>
        <div className="flex flex-shrink-0 items-center gap-3">
          <span className="text-right text-xs leading-tight text-muted-foreground">
            <b className="text-[13px] font-bold text-foreground">{acquired}</b>{' '}
            {acquired > 1 ? 'acquises' : 'acquise'}
            <br />
            sur {bloc.competences.length}
          </span>
          <ProgressRing pct={progress} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-center gap-x-6 px-5 pt-3 pb-2 sm:grid-cols-[1fr_320px]">
        <span className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Compétence
        </span>
        <div className="hidden grid-cols-4 sm:grid">
          {LEVEL_ORDER.map((lvl) => (
            <span
              key={lvl}
              className="text-center text-[10px] font-semibold tracking-[0.04em] text-muted-foreground uppercase"
            >
              {lvl}
            </span>
          ))}
        </div>
      </div>

      {bloc.competences.map((comp, i) => (
        <div
          key={comp.id}
          className="grid grid-cols-1 items-center gap-x-6 gap-y-2.5 border-t border-hairline px-5 py-2.5 transition-colors hover:bg-muted/40 sm:grid-cols-[1fr_320px]"
        >
          <span className="flex items-center gap-2.5 text-sm">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-border" />
            {comp.label}
          </span>
          <Thread comp={comp} top={tops[i]} editable={editable} onSet={onSet} />
        </div>
      ))}
    </section>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  return (
    <div
      className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--accent) ${pct}%, var(--hairline) 0)`,
      }}
    >
      <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-card font-mono text-[10.5px] font-bold text-brand-strong">
        {pct}%
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/** Lay out the three voices: evaluated beads on the track, the rest in the antechamber. */
function layoutBeads(comp: CompetenceView) {
  const onTrack: { role: EvaluatorRole; left: number }[] = [];
  const waiting: EvaluatorRole[] = [];

  // group evaluated voices by level so co-located beads fan out like stacked coins
  const byLevel = new Map<CompetenceLevel, EvaluatorRole[]>();
  for (const v of VOICES) {
    const lvl = comp.evaluations[v.role];
    if (lvl) {
      const arr = byLevel.get(lvl) ?? [];
      arr.push(v.role);
      byLevel.set(lvl, arr);
    } else {
      waiting.push(v.role);
    }
  }
  for (const [lvl, roles] of byLevel) {
    const cx = levelCenter(lvl);
    roles.forEach((role, i) => {
      const off = (i - (roles.length - 1) / 2) * CLUSTER_OFFSET;
      onTrack.push({ role, left: cx + off });
    });
  }
  return { onTrack, waiting };
}

function Thread({
  comp,
  top,
  editable,
  onSet,
}: {
  comp: CompetenceView;
  top: CompetenceLevel | null;
  editable: EvaluatorRole | null;
  onSet: (competenceId: string, level: CompetenceLevel) => void;
}) {
  const fillWidth = top ? (LEVEL_INDEX[top] + 1) * 25 : 0;
  const { onTrack, waiting } = layoutBeads(comp);
  const editableValue = editable ? comp.evaluations[editable] : undefined;

  // screen-reader summary of all three voices
  const srSummary = VOICES.map(
    (v) => `${v.label} : ${comp.evaluations[v.role] ? LEVEL_LABEL[comp.evaluations[v.role]!] : 'non évalué'}`,
  ).join('. ');

  return (
    <div
      className="relative h-[30px] rounded-full bg-muted shadow-[inset_0_0_0_1px_var(--hairline)]"
      style={{ paddingLeft: ANTECHAMBER }}
    >
      <span className="sr-only">{srSummary}</span>

      {/* antechamber divider */}
      <span
        className="absolute inset-y-0 left-0 border-r border-dashed border-border"
        style={{ width: ANTECHAMBER }}
        aria-hidden
      />

      {/* unplaced (not-yet-evaluated) voices wait here */}
      {waiting.map((role, i) => {
        const isEditable = role === editable;
        return (
          <span
            key={role}
            title={`${VOICE_BY_ROLE[role].label} · pas encore évalué`}
            className={cn(
              'absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-card',
              isEditable ? 'border-2 border-dashed' : 'border-2 border-border',
            )}
            style={{
              left: WAITING_GAP + i * WAITING_GAP,
              ...(isEditable && { borderColor: VOICE_BY_ROLE[role].color }),
            }}
            aria-hidden
          />
        );
      })}

      {/* the track */}
      <div className="absolute inset-y-0 right-0 rounded-full" style={{ left: ANTECHAMBER }}>
        {/* achieved fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${fillWidth}%`, background: TRACK_FILL }}
          aria-hidden
        />
        {/* zone dividers */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-4" aria-hidden>
          {LEVEL_ORDER.map((lvl, i) => (
            <span
              key={lvl}
              className={i < 3 ? 'border-r border-dashed border-[rgba(20,23,33,0.07)]' : ''}
            />
          ))}
        </div>

        {/* editable layer: 4 zone radios (one tab stop, arrow-key navigable) */}
        {editable && (
          <div role="radiogroup" aria-label="Définir votre niveau" className="absolute inset-0">
            {LEVEL_ORDER.map((lvl) => (
              <label
                key={lvl}
                title={LEVEL_LABEL[lvl]}
                className="absolute inset-y-0 cursor-pointer rounded-full transition-colors hover:bg-[color-mix(in_srgb,var(--voice-auto)_7%,transparent)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--voice-auto)]"
                style={{ left: `${LEVEL_INDEX[lvl] * 25}%`, width: '25%' }}
              >
                <input
                  type="radio"
                  name={`lvl-${comp.id}`}
                  className="sr-only"
                  checked={editableValue === lvl}
                  onChange={() => onSet(comp.id, lvl)}
                  aria-label={LEVEL_LABEL[lvl]}
                />
              </label>
            ))}
          </div>
        )}

        {/* beads on the track — they pop on arrival and glide when re-evaluated */}
        {onTrack.map(({ role, left }) => {
          const v = VOICE_BY_ROLE[role];
          const isEditable = role === editable;
          const lvl = comp.evaluations[role]!;
          return (
            <span
              key={role}
              title={`${v.label} · ${LEVEL_LABEL[lvl]}`}
              className={cn(
                'pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-[450ms] ease-[var(--ease-spring)]',
                isEditable ? 'z-30 h-[19px] w-[19px]' : 'z-20 h-[15px] w-[15px]',
              )}
              style={{ left: `${left}%` }}
            >
              {/* keyed on the level so a fresh evaluation re-triggers the pop */}
              <span
                key={lvl}
                className="bead-pop absolute inset-0 rounded-full"
                style={{
                  backgroundColor: v.color,
                  boxShadow: isEditable ? v.glow : BEAD_SHADOW,
                }}
                aria-hidden
              >
                {isEditable && (
                  <span className="absolute inset-0 m-auto h-[6px] w-[6px] rounded-full bg-white/95" />
                )}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
