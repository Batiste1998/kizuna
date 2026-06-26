import { useEffect, useState, type ReactNode } from 'react';
import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import {
  api,
  type AdminOverview,
  type Bilan,
  type Echeance,
  type JournalEntry,
  type PlatformOverview,
  type TutorAlternant,
} from '#/lib/api';
import { useMe } from '#/lib/me-context';
import { BILAN_STATUS_META, JOURNAL_STATUS_META } from '#/lib/levels';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/app/')({
  component: AppHome,
});

function AppHome() {
  const me = useMe();
  // The super admin's home is the dedicated platform dashboard.
  if (me.role === 'super_admin') return <Navigate to="/app/superadmin" replace />;
  const isAdmin = me.memberRoles.some((r) => r === 'admin' || r === 'owner');
  const isTutor = me.memberRoles.some((r) => r === 'tuteur_pedagogique' || r === 'tuteur_entreprise');

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour {me.name?.split(' ')[0] ?? ''} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Voici un aperçu de votre suivi d’alternance.
        </p>
      </div>

      {me.isAlternant && <AlternantDashboard />}
      {isTutor && <TutorDashboard />}
      {isAdmin && <AdminDashboard />}
      {me.role === 'super_admin' && <SuperDashboard />}
    </div>
  );
}

/* ---------- Alternant ---------- */

function AlternantDashboard() {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [nextBilan, setNextBilan] = useState<Bilan | null>(null);
  const [nextEcheance, setNextEcheance] = useState<Echeance | null>(null);
  const [lastEntry, setLastEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    let active = true;
    api
      .myAlternantProfile()
      .then(async ({ alternantProfilId: id }) => {
        const [competences, bilans, echeancier, journal] = await Promise.all([
          api.getCompetences(id).catch(() => null),
          api.getBilans(id).catch(() => null),
          api.getEcheances(id).catch(() => null),
          api.getJournal(id).catch(() => null),
        ]);
        if (!active) return;
        if (competences) {
          const all = competences.blocs.flatMap((b) => b.competences);
          setProgress({
            done: all.filter((c) => c.evaluations.auto && c.evaluations.auto !== 'NA').length,
            total: all.length,
          });
        }
        if (bilans) {
          const upcoming = bilans.bilans
            .filter((b) => b.status === 'planned')
            .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
          setNextBilan(upcoming[0] ?? null);
        }
        if (echeancier) {
          const today = new Date().toISOString().slice(0, 10);
          const upcoming = echeancier.echeances
            .filter((e) => e.dueDate >= today)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          setNextEcheance(upcoming[0] ?? null);
        }
        if (journal) setLastEntry(journal.entries[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Section title="Mon suivi">
      <div className="grid gap-4 sm:grid-cols-2">
        <DashCard title="Auto-évaluation des compétences" to="/app/competences">
          {progress ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">{pct}%</span>
                <span className="text-xs text-muted-foreground">
                  {progress.done}/{progress.total} compétences
                </span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-brand-gradient h-full rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          ) : (
            <Muted>Chargement…</Muted>
          )}
        </DashCard>

        <DashCard title="Prochain bilan" to="/app/bilans">
          {nextBilan ? (
            <div className="space-y-1">
              <div className="font-medium">{nextBilan.label}</div>
              <div className="flex items-center gap-2 text-xs">
                <Badge meta={BILAN_STATUS_META[nextBilan.status]} />
                <span className="text-muted-foreground">{formatDate(nextBilan.scheduledAt)}</span>
              </div>
            </div>
          ) : (
            <Muted>Aucun bilan planifié.</Muted>
          )}
        </DashCard>

        <DashCard title="Prochaine échéance" to="/app/echeancier">
          {nextEcheance ? (
            <div className="space-y-1">
              <div className="font-medium">{nextEcheance.title}</div>
              <div className="text-xs text-muted-foreground">{formatDate(nextEcheance.dueDate)}</div>
            </div>
          ) : (
            <Muted>Aucune échéance à venir.</Muted>
          )}
        </DashCard>

        <DashCard title="Dernière entrée de journal" to="/app/journal">
          {lastEntry ? (
            <div className="space-y-1">
              <div className="font-medium">{lastEntry.title}</div>
              <Badge meta={JOURNAL_STATUS_META[lastEntry.status]} />
            </div>
          ) : (
            <Muted>Aucune entrée pour le moment.</Muted>
          )}
        </DashCard>
      </div>
    </Section>
  );
}

/* ---------- Tuteur ---------- */

function TutorDashboard() {
  const [alternants, setAlternants] = useState<TutorAlternant[] | null>(null);

  useEffect(() => {
    api
      .getMyAlternants()
      .then(setAlternants)
      .catch(() => setAlternants([]));
  }, []);

  return (
    <Section title="Mes alternants" action={{ to: '/app/alternants', label: 'Voir tout' }}>
      {!alternants ? (
        <Muted>Chargement…</Muted>
      ) : alternants.length === 0 ? (
        <Muted>Aucun alternant ne vous est rattaché.</Muted>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {alternants.slice(0, 4).map((a) => {
            const pct =
              a.progress.total > 0 ? Math.round((a.progress.evaluated / a.progress.total) * 100) : 0;
            return (
              <Link
                key={a.alternantProfilId}
                to="/app/alternants/$alternantId/competences"
                params={{ alternantId: a.alternantProfilId }}
                className="rounded-2xl border border-hairline bg-card p-5 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="font-semibold">{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.promotionName ?? '—'}</div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-brand-gradient h-full rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{pct}% évalué</div>
              </Link>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/* ---------- Admin établissement ---------- */

function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  useEffect(() => {
    api
      .adminOverview()
      .then(setOverview)
      .catch(() => undefined);
  }, []);

  if (!overview) return null;

  return (
    <Section
      title={`Établissement · ${overview.organizationName}`}
      action={{ to: '/app/admin', label: 'Administration' }}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Alternants" value={overview.counts.alternants} />
        <Kpi label="Membres" value={overview.counts.members} />
        <Kpi label="Entreprises" value={overview.counts.entreprises} />
        <Kpi label="Promotions" value={overview.counts.promotions} />
      </div>
    </Section>
  );
}

/* ---------- Super admin ---------- */

function SuperDashboard() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);

  useEffect(() => {
    api
      .superOverview()
      .then(setOverview)
      .catch(() => undefined);
  }, []);

  if (!overview) return null;

  return (
    <Section title="Plateforme" action={{ to: '/app/superadmin', label: 'Super admin' }}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Écoles" value={overview.counts.organizations} />
        <Kpi label="Utilisateurs" value={overview.counts.users} />
        <Kpi label="Alternants" value={overview.counts.alternants} />
        <Kpi label="Tickets ouverts" value={overview.counts.openTickets} />
      </div>
    </Section>
  );
}

/* ---------- Shared bits ---------- */

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { to: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
        {action && (
          <Link
            to={action.to as '/app'}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            {action.label} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function DashCard({ title, to, children }: { title: string; to: string; children: ReactNode }) {
  return (
    <Link
      to={to as '/app'}
      className="block rounded-2xl border border-hairline bg-card p-5 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
        {title}
      </div>
      {children}
    </Link>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-hairline bg-card p-5 shadow-md">
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Badge({ meta }: { meta: { label: string; className: string } }) {
  return (
    <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold', meta.className)}>
      {meta.label}
    </span>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'medium' });
}
