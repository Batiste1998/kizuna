import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Award,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Target,
} from 'lucide-react';
import { useSession } from '#/lib/auth-client';
import { useMe } from '#/lib/me-context';
import {
  api,
  type AdminAlternant,
  type AlternantCompetences,
  type Bilan,
  type CompetenceLevel,
  type EvaluatorRole,
  type JournalEntry,
} from '#/lib/api';
import { EVALUATOR_VOICE_COLORS, EVALUATOR_VOICE_LABELS } from '#/lib/levels';
import { CenteredLoading } from '#/components/shell';
import { Avatar } from '#/components/super-ui';
import { ProgressBar } from '#/components/ui/progress-bar';
import { cn } from '#/lib/utils';
import { CompetencesPanel } from '#/components/competences-panel';
import { JournalPanel } from '#/components/journal-panel';
import { BilansPanel } from '#/components/bilans-panel';
import { DocumentsPanel } from '#/components/documents-panel';

export const Route = createFileRoute('/app/alternants/$alternantId/')({
  component: AlternantFichePage,
});

const LEVEL_VALUE: Record<CompetenceLevel, number> = { NA: 0, EC: 1, A: 2, M: 3 };

const TABS = [
  { key: 'overview', label: "Vue d'ensemble" },
  { key: 'competences', label: 'Compétences' },
  { key: 'journal', label: "Journal d'activités" },
  { key: 'bilans', label: 'Bilans' },
  { key: 'documents', label: 'Documents' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

/** Highest level reached across the three evaluators (consolidated reading). */
function consolidated(evaluations: Partial<Record<string, CompetenceLevel>>): number {
  const vals = Object.values(evaluations).filter(Boolean) as CompetenceLevel[];
  if (vals.length === 0) return 0;
  return Math.max(...vals.map((v) => LEVEL_VALUE[v]));
}

function rncpNiveauLabel(level: number | null): string | null {
  if (!level) return null;
  const bac: Record<number, string> = { 5: 'Bac+2', 6: 'Bac+3/4', 7: 'Bac+5', 8: 'Bac+8' };
  return bac[level] ? `Niveau ${level} (${bac[level]})` : `Niveau ${level}`;
}

function AlternantFichePage() {
  const { alternantId } = Route.useParams();
  const { data: session, isPending } = useSession();
  const me = useMe();
  const navigate = useNavigate();
  const isAdmin = me.memberRoles.some((r) => r === 'admin' || r === 'owner');

  const [tab, setTab] = useState<TabKey>('overview');
  const [header, setHeader] = useState<{
    name: string | null;
    email: string | null;
    promotionName: string | null;
    entrepriseName: string | null;
    tuteurPedaName: string | null;
    tuteurEntrepriseName: string | null;
    progressPct: number;
  } | null>(null);
  const [rncpLevel, setRncpLevel] = useState<number | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [competences, setCompetences] = useState<AlternantCompetences | null>(null);
  const [bilans, setBilans] = useState<Bilan[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function loadHeader() {
      if (isAdmin) {
        const [list, promos, schools] = await Promise.all([
          api.adminAlternants().catch(() => [] as AdminAlternant[]),
          api.adminPromotions().catch(() => []),
          api.adminSchools().catch(() => ({ activeId: null, schools: [] })),
        ]);
        const a = list.find((x) => x.alternantProfilId === alternantId);
        if (!a) return null;
        const promo = promos.find((p) => p.name === a.promotionName);
        if (!cancelled) {
          setRncpLevel(promo?.rncpLevel ?? null);
          setSchoolName(schools.schools.find((s) => s.id === schools.activeId)?.name ?? null);
        }
        return {
          name: a.name,
          email: a.email,
          promotionName: a.promotionName,
          entrepriseName: a.entrepriseName,
          tuteurPedaName: a.tuteurPedaName,
          tuteurEntrepriseName: a.tuteurEntrepriseName,
          progressPct: a.progressPct,
        };
      }
      const list = await api.getMyAlternants().catch(() => []);
      const a = list.find((x) => x.alternantProfilId === alternantId);
      if (!a) return null;
      const pct = a.progress.total > 0 ? Math.round((a.progress.evaluated / a.progress.total) * 100) : 0;
      return {
        name: a.name,
        email: a.email,
        promotionName: a.promotionName ?? null,
        entrepriseName: a.entrepriseName ?? null,
        tuteurPedaName: a.tuteurPedaName,
        tuteurEntrepriseName: a.tuteurEntrepriseName,
        progressPct: pct,
      };
    }

    Promise.all([
      loadHeader(),
      api.getCompetences(alternantId).catch(() => null),
      api.getBilans(alternantId).catch(() => null),
      api.getJournal(alternantId).catch(() => null),
    ])
      .then(([h, comp, bil, jou]) => {
        if (cancelled) return;
        if (!h) setNotFound(true);
        else setHeader(h);
        setCompetences(comp);
        setBilans(bil?.bilans ?? []);
        setJournal(jou?.entries ?? []);
      })
      .finally(() => !cancelled && setLoaded(true));

    return () => {
      cancelled = true;
    };
  }, [session, alternantId, isAdmin]);

  const stats = useMemo(() => {
    if (!competences) return null;
    const blocs = competences.blocs.map((b) => {
      const total = b.competences.length;
      const acquired = b.competences.filter((c) => consolidated(c.evaluations) >= 2).length;
      const avg = total
        ? b.competences.reduce((s, c) => s + consolidated(c.evaluations), 0) / (total * 3)
        : 0;
      // Average level per evaluator (0..1) — one radar trace per voice of the trinôme.
      const voiceAvg = (role: EvaluatorRole) =>
        total
          ? b.competences.reduce(
              (s, c) => s + (c.evaluations[role] ? LEVEL_VALUE[c.evaluations[role]!] : 0),
              0,
            ) /
            (total * 3)
          : 0;
      const voices: Record<EvaluatorRole, number> = {
        auto: voiceAvg('auto'),
        peda: voiceAvg('peda'),
        entreprise: voiceAvg('entreprise'),
      };
      return {
        code: b.code,
        label: b.label,
        total,
        acquired,
        avg,
        voices,
        validated: total > 0 && acquired === total,
      };
    });
    const allComps = competences.blocs.flatMap((b) => b.competences);
    return {
      blocs,
      totalComp: allComps.length,
      acquiredComp: allComps.filter((c) => consolidated(c.evaluations) >= 2).length,
      blocsValides: blocs.filter((b) => b.validated).length,
      totalBlocs: blocs.length,
    };
  }, [competences]);

  const nextBilan = useMemo(
    () =>
      bilans
        .filter((b) => b.status === 'planned' && new Date(b.scheduledAt) >= new Date(Date.now() - 86400000))
        .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))[0] ?? null,
    [bilans],
  );
  const lastActivity = useMemo(
    () =>
      [...journal].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0] ?? null,
    [journal],
  );

  if (isPending || (!loaded && session)) return <CenteredLoading />;
  if (!session) return null;

  const backTo = isAdmin ? '/app/admin/alternants' : '/app/alternants';

  return (
    <div data-role="alternant" className="mx-auto max-w-5xl space-y-5 px-6 py-8">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-strong"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux alternants
      </Link>

      {notFound || !header ? (
        <p className="rounded-2xl border border-hairline bg-card p-8 text-center text-sm text-muted-foreground shadow-md">
          Alternant introuvable ou non rattaché à votre établissement.
        </p>
      ) : (
        <>
          {/* Header card */}
          <div className="rounded-2xl border border-hairline bg-card p-6 shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <Avatar name={header.name} role="alternant" size={64} />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-bold tracking-tight">{header.name ?? '—'}</h1>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-0.5 text-[12px] font-semibold text-brand-strong">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Alternance en cours
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[header.promotionName, schoolName].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {competences?.referentiel && (
                      <Chip icon={<Award className="h-3.5 w-3.5" />}>
                        <span className="font-mono">{competences.referentiel.code}</span>
                        {rncpNiveauLabel(rncpLevel) && <span> · {rncpNiveauLabel(rncpLevel)}</span>}
                      </Chip>
                    )}
                    {header.entrepriseName && (
                      <Chip icon={<Briefcase className="h-3.5 w-3.5" />}>{header.entrepriseName}</Chip>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-6 pt-1.5">
                    <Tutor label="Tuteur pédagogique" name={header.tuteurPedaName} role="tuteur_pedagogique" />
                    <Tutor label="Tuteur entreprise" name={header.tuteurEntrepriseName} role="tuteur_entreprise" />
                  </div>
                </div>
              </div>
              <Donut pct={header.progressPct} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-hairline">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'relative px-4 py-2.5 text-sm font-medium transition-colors',
                  tab === t.key ? 'text-brand-strong' : 'text-muted-foreground hover:text-secondary-foreground',
                )}
              >
                {t.label}
                {tab === t.key && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />
                )}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <Overview
              progressPct={header.progressPct}
              stats={stats}
              nextBilan={nextBilan}
              lastActivity={lastActivity}
            />
          )}
          {tab === 'competences' && <CompetencesPanel alternantProfilId={alternantId} />}
          {tab === 'journal' && <JournalPanel alternantProfilId={alternantId} />}
          {tab === 'bilans' && <BilansPanel alternantProfilId={alternantId} />}
          {tab === 'documents' && <DocumentsPanel alternantProfilId={alternantId} />}
        </>
      )}
    </div>
  );
}

function Overview({
  progressPct,
  stats,
  nextBilan,
  lastActivity,
}: {
  progressPct: number;
  stats: StatsShape | null;
  nextBilan: Bilan | null;
  lastActivity: JournalEntry | null;
}) {
  return (
    <div className="space-y-4">
      <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Progression globale" value={`${progressPct}%`} sub="auto-évaluation" icon={<Target />} />
        <Stat
          label="Blocs validés"
          value={stats ? `${stats.blocsValides}/${stats.totalBlocs}` : '—'}
          sub="blocs de compétences"
          icon={<Award />}
        />
        <Stat
          label="Compétences acquises"
          value={stats ? `${stats.acquiredComp}/${stats.totalComp}` : '—'}
          sub="niveau Acquis ou +"
          icon={<CheckCircle2 />}
        />
        <Stat
          label="Prochain bilan"
          value={nextBilan ? formatShort(nextBilan.scheduledAt) : '—'}
          sub={nextBilan ? nextBilan.label : 'aucun planifié'}
          icon={<CalendarCheck />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-hairline bg-card p-5 shadow-md">
          <h2 className="text-base font-bold tracking-tight">Radar de compétences</h2>
          <p className="text-xs text-muted-foreground">
            Niveau moyen par bloc, une trace par voix — les écarts se discutent en bilan.
          </p>
          <div className="mt-4 flex justify-center">
            <Radar
              labels={(stats?.blocs ?? []).map((b) => b.code)}
              series={RADAR_VOICES.map((v) => ({
                ...v,
                values: (stats?.blocs ?? []).map((b) => b.voices[v.role]),
              }))}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            {RADAR_VOICES.map((v) => (
              <span
                key={v.role}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: v.color }} />
                {v.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-hairline bg-card p-5 shadow-md">
          <h2 className="text-base font-bold tracking-tight">Progression par bloc</h2>
          <p className="text-xs text-muted-foreground">Compétences acquises par bloc</p>
          <div className="mt-4 space-y-3.5">
            {(stats?.blocs ?? []).map((b) => (
              <div key={b.code}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">
                    <span className="font-mono text-brand-strong">{b.code}</span> · {b.label}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {b.acquired}/{b.total} acquises
                  </span>
                </div>
                <ProgressBar pct={b.total ? (b.acquired / b.total) * 100 : 0} className="mt-1.5" />
              </div>
            ))}
            {!stats?.blocs.length && (
              <p className="text-sm text-muted-foreground">Aucun référentiel rattaché.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-hairline bg-card p-5 shadow-md">
          <h2 className="text-base font-bold tracking-tight">Prochain bilan</h2>
          {nextBilan ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{nextBilan.label}</div>
                <div className="text-sm text-muted-foreground">{formatLong(nextBilan.scheduledAt)}</div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Aucun bilan planifié.</p>
          )}
        </div>

        <div className="rounded-2xl border border-hairline bg-card p-5 shadow-md">
          <h2 className="text-base font-bold tracking-tight">Dernière activité</h2>
          {lastActivity ? (
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand" />
                <span className="font-semibold">{lastActivity.title}</span>
              </div>
              <div className="mt-1 pl-4 text-sm text-muted-foreground">
                {formatLong(lastActivity.createdAt)}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Aucune entrée de journal.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper type alias so Overview's prop typing reads cleanly.
type StatsShape = {
  blocs: Array<{
    code: string;
    label: string;
    total: number;
    acquired: number;
    avg: number;
    voices: Record<EvaluatorRole, number>;
    validated: boolean;
  }>;
  totalComp: number;
  acquiredComp: number;
  blocsValides: number;
  totalBlocs: number;
};

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-muted/60 px-2.5 py-1 text-xs font-medium text-secondary-foreground">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </span>
  );
}

function Tutor({ label, name, role }: { label: string; name: string | null; role: string }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar name={name} role={role} size={28} />
      <div className="leading-tight">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{name ?? 'Non assigné'}</div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-card p-5 shadow-md">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-strong [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </div>
      </div>
      <div className="mt-2.5 text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

/** Circular progress ring. */
function Donut({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[92px] w-[92px]">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={off}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">{pct}%</div>
      </div>
      <div className="mt-1 text-center text-[11px] leading-tight text-muted-foreground">
        Progression
        <br />
        globale
      </div>
    </div>
  );
}

/** The three traces of the radar, in the trinôme's colours. Dash patterns keep
 * the voices tellable apart without relying on colour alone. */
const RADAR_DASHES: Record<EvaluatorRole, string | undefined> = {
  auto: undefined,
  peda: '6 4',
  entreprise: '2 4',
};
const RADAR_VOICES = (['auto', 'peda', 'entreprise'] as const).map((role) => ({
  role,
  label: EVALUATOR_VOICE_LABELS[role],
  color: EVALUATOR_VOICE_COLORS[role].color,
  dash: RADAR_DASHES[role],
}));

type RadarSeries = { role: EvaluatorRole; label: string; color: string; dash?: string; values: number[] };

/** Lightweight SVG radar chart — one overlaid polygon per voice (0..1 values). */
function Radar({ labels, series }: { labels: string[]; series: RadarSeries[] }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 86;
  const n = labels.length;
  if (n < 3) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Pas assez de blocs pour un radar.
      </div>
    );
  }
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, rr: number) => [cx + Math.cos(angle(i)) * rr, cy + Math.sin(angle(i)) * rr];
  const rings = [0.25, 0.5, 0.75, 1];
  // A voice with no evaluation at all would collapse to a dot — leave it out.
  const drawn = series.filter((s) => s.values.some((v) => v > 0.011));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-[240px] w-[240px]" role="img" aria-label="Radar des niveaux moyens par bloc, une trace par évaluateur">
      {rings.map((rr) => (
        <polygon
          key={rr}
          points={labels.map((_, i) => pt(i, radius * rr).join(',')).join(' ')}
          fill="none"
          stroke="var(--border)"
        />
      ))}
      {labels.map((_, i) => {
        const [x, y] = pt(i, radius);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" />;
      })}
      {drawn.map((s, si) => {
        const poly = s.values.map((v, i) => pt(i, radius * Math.max(0.04, v)).join(',')).join(' ');
        return (
          <g key={s.role} className="radar-shape" style={{ animationDelay: `${si * 180}ms` }}>
            <polygon
              points={poly}
              fill={`color-mix(in srgb, ${s.color} 13%, transparent)`}
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeDasharray={s.dash}
            />
            {s.values.map((v, i) => {
              const [x, y] = pt(i, radius * Math.max(0.04, v));
              return <circle key={`d${i}`} cx={x} cy={y} r="2.5" fill={s.color} />;
            })}
          </g>
        );
      })}
      {labels.map((label, i) => {
        const [x, y] = pt(i, radius + 16);
        return (
          <text
            key={`t${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[var(--muted-foreground)] font-mono text-[10px] font-semibold"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
function formatLong(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
