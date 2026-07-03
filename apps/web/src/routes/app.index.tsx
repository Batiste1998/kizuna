import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import {
  Award,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { api, type AlternantDashboard as AltDash, type TutorDashboard } from '#/lib/api';
import { useMe } from '#/lib/me-context';
import { Avatar, PageHead, Panel, StatCard } from '#/components/super-ui';
import { ProgressBar } from '#/components/ui/progress-bar';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/app/')({
  component: AppHome,
});

function AppHome() {
  const me = useMe();
  if (me.role === 'super_admin') return <Navigate to="/app/superadmin" replace />;
  if (me.role === 'support') return <Navigate to="/app/support" replace />;
  const isAdmin = me.memberRoles.some((r) => r === 'admin' || r === 'owner');
  if (isAdmin) return <Navigate to="/app/admin" replace />;
  const isTutor = me.memberRoles.some(
    (r) => r === 'tuteur_pedagogique' || r === 'tuteur_entreprise',
  );
  if (isTutor) return <TutorHome />;
  return <AlternantHome />;
}

const firstName = (name?: string | null) => name?.split(' ')[0] ?? '';

/* ===================== ALTERNANT ===================== */

function AlternantHome() {
  const me = useMe();
  const [d, setD] = useState<AltDash | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .alternantDashboard()
      .then((res) => setD(res))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const t = d?.trinome;
  const nextDate = d?.nextBilan
    ? new Date(d.nextBilan.scheduledAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
      <PageHead title={`Bonjour ${firstName(me.name)} 👋`}>
        {d?.titleName ? (
          <>
            Voici votre progression sur le titre{' '}
            <strong className="font-semibold text-secondary-foreground">{d.titleName}</strong>.
          </>
        ) : (
          'Voici un aperçu de votre suivi d’alternance.'
        )}
      </PageHead>

      <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Progression"
          value={d ? `${d.progressionPct}%` : '—'}
          sub="consolidée"
          icon={<TrendingUp />}
          to="/app/competences"
        />
        <StatCard
          label="Blocs validés"
          value={d ? `${d.blocs.validated}/${d.blocs.total}` : '—'}
          sub="de compétences"
          icon={<Award />}
          to="/app/competences"
        />
        <StatCard
          label="Compétences acquises"
          value={d ? `${d.competences.acquired}/${d.competences.total}` : '—'}
          sub="niveau Acquis ou +"
          icon={<CheckCircle2 />}
          to="/app/competences"
        />
        <StatCard
          label="À auto-évaluer"
          value={d ? d.toSelfEvaluate : '—'}
          sub="avant le bilan"
          icon={<Target />}
          to="/app/competences"
        />
      </div>

      <div className="stagger-children grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <div className="mb-4 text-[15px] font-semibold">Mon trinôme de suivi</div>
          <div className="flex flex-col gap-3">
            <TrinomeRow icon={<GraduationCap className="h-4 w-4" />} role="Tuteur pédagogique" name={t?.peda} />
            <TrinomeRow icon={<Users className="h-4 w-4" />} role="Tuteur d’entreprise" name={t?.entrepriseTutor} />
            <TrinomeRow icon={<Briefcase className="h-4 w-4" />} role="Entreprise" name={t?.entreprise} />
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="p-6">
            <div className="mb-3 text-[15px] font-semibold">Prochain bilan</div>
            {d?.nextBilan ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">{d.nextBilan.label}</div>
                  <div className="text-sm text-muted-foreground">{nextDate}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun bilan planifié pour le moment.</p>
            )}
          </Panel>

          {loaded && d && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-brand-soft bg-brand-soft/50 px-5 py-4 text-sm font-medium text-brand-strong">
              <Target className="h-4 w-4 shrink-0" />
              {d.toSelfEvaluate > 0 ? (
                <span>
                  <strong>{d.toSelfEvaluate} compétences</strong> à auto-évaluer avant le prochain bilan.
                </span>
              ) : (
                <span>Toutes vos compétences sont auto-évaluées. Beau travail !</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrinomeRow({ icon, role, name }: { icon: React.ReactNode; role: string; name?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{role}</div>
        <div className={cn('font-semibold', !name && 'font-medium text-muted-foreground/70 italic')}>
          {name ?? 'Non assigné'}
        </div>
      </div>
    </div>
  );
}

/* ===================== TUTEUR ===================== */

function TutorHome() {
  const me = useMe();
  const [data, setData] = useState<TutorDashboard | null>(null);
  const [role, setRole] = useState<'peda' | 'entreprise'>('peda');

  useEffect(() => {
    api
      .tutorDashboard()
      .then((res) => {
        setData(res);
        // Default to whichever role the tutor actually holds.
        const roles = new Set(res.alternants.map((a) => a.myRole));
        if (!roles.has('peda') && roles.has('entreprise')) setRole('entreprise');
      })
      .catch(() => undefined);
  }, []);

  const roles = useMemo(
    () => new Set((data?.alternants ?? []).map((a) => a.myRole)),
    [data],
  );
  const both = roles.has('peda') && roles.has('entreprise');
  const list = useMemo(
    () => (data?.alternants ?? []).filter((a) => a.myRole === role),
    [data, role],
  );

  const toEvaluate = list.reduce((s, a) => s + a.toEvaluate, 0);
  const avgProgress =
    list.length > 0
      ? Math.round(
          (list.reduce(
            (s, a) => s + (a.progress.total > 0 ? a.progress.evaluated / a.progress.total : 0),
            0,
          ) /
            list.length) *
            100,
        )
      : 0;
  const roleLabel = role === 'peda' ? 'tuteur pédagogique' : 'tuteur d’entreprise';

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
      <PageHead
        title={`Bonjour ${firstName(me.name)} 👋`}
        actions={
          both ? (
            <div className="flex rounded-xl border border-hairline bg-card p-1 shadow-sm">
              <RoleTab active={role === 'peda'} onClick={() => setRole('peda')}>
                Pédagogique
              </RoleTab>
              <RoleTab active={role === 'entreprise'} onClick={() => setRole('entreprise')}>
                Entreprise
              </RoleTab>
            </div>
          ) : undefined
        }
      >
        Vous suivez{' '}
        <strong className="font-semibold text-secondary-foreground">
          {list.length} alternant{list.length > 1 ? 's' : ''}
        </strong>{' '}
        en tant que {roleLabel}.
      </PageHead>

      <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Mes alternants" value={list.length} sub="en suivi" icon={<Users />} to="/app/alternants" />
        <StatCard label="À évaluer" value={toEvaluate} sub="compétences" icon={<Target />} />
        <StatCard label="Bilans à venir" value={data?.upcomingBilans ?? '—'} sub="à planifier" icon={<CalendarClock />} />
        <StatCard label="Progression moyenne" value={`${avgProgress}%`} sub="de mes alternants" icon={<TrendingUp />} />
      </div>

      <div>
        <div className="mb-3 text-[15px] font-semibold">Mes alternants</div>
        {list.length === 0 ? (
          <Panel className="px-5 py-14 text-center text-sm text-muted-foreground">
            Aucun alternant rattaché pour ce rôle.
          </Panel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((a) => {
              const pct =
                a.progress.total > 0 ? Math.round((a.progress.evaluated / a.progress.total) * 100) : 0;
              return (
                <Link
                  key={a.alternantProfilId}
                  to="/app/alternants/$alternantId/competences"
                  params={{ alternantId: a.alternantProfilId }}
                  className="rounded-2xl border border-hairline bg-card p-5 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={a.name} role="alternant" size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{a.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[a.promotionName, a.entrepriseName].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                    {a.toEvaluate > 0 && (
                      <span className="flex-none rounded-full bg-status-orange px-2.5 py-0.5 text-[11.5px] font-semibold text-status-orange-fg">
                        {a.toEvaluate} à évaluer
                      </span>
                    )}
                  </div>
                  <div className="mt-3.5 flex items-center gap-3">
                    <ProgressBar pct={pct} className="flex-1" />
                    <span className="w-9 text-right text-[13px] font-semibold text-secondary-foreground">
                      {pct}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RoleTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
        active ? 'bg-brand text-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
