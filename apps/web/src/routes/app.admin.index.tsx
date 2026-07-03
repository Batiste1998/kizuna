import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AlertTriangle, Clock, Link2, UserPlus, Users } from 'lucide-react';
import { api, type AdminDashboard } from '#/lib/api';
import { useMe } from '#/lib/me-context';
import { Avatar, PageHead, Panel, StatCard } from '#/components/super-ui';
import { Button } from '#/components/ui/button';
import { ProgressBar } from '#/components/ui/progress-bar';

export const Route = createFileRoute('/app/admin/')({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const me = useMe();
  const [data, setData] = useState<AdminDashboard | null>(null);

  useEffect(() => {
    void api.adminDashboard().then(setData).catch(() => undefined);
  }, []);

  const firstName = me.name?.split(' ')[0] ?? '';

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
      <PageHead
        title={`Bonjour ${firstName} 👋`}
        actions={
          <Link to="/app/admin/alternants">
            <Button>
              <UserPlus /> Nouvel alternant
            </Button>
          </Link>
        }
      >
        Voici l’état du suivi pour{' '}
        <strong className="font-semibold text-secondary-foreground">
          {data?.organizationName ?? '…'}
        </strong>
        .
      </PageHead>

      <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Alternants"
          value={data?.counts.alternants ?? '—'}
          sub="suivis cette année"
          icon={<Users />}
          to="/app/admin/alternants"
        />
        <StatCard
          label="Associations complètes"
          value={data?.counts.associationsComplete ?? '—'}
          sub="trinômes constitués"
          icon={<Link2 />}
          to="/app/admin/associations"
        />
        <StatCard
          label="Suivis en retard"
          value={data?.counts.lateBilans ?? '—'}
          sub="bilans à planifier"
          icon={<Clock />}
        />
        <StatCard
          label="À compléter"
          value={data?.counts.associationsPartial ?? '—'}
          sub="associations partielles"
          icon={<AlertTriangle />}
          to="/app/admin/associations"
        />
      </div>

      <div className="stagger-children grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Suivi à traiter */}
        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-semibold">Suivi à traiter</div>
            <Link
              to="/app/admin/alternants"
              className="text-xs font-semibold text-brand-strong hover:underline"
            >
              Voir tout
            </Link>
          </div>
          <div className="mb-3 text-xs text-muted-foreground">
            Alternants en retard ou dont l’association est incomplète
          </div>
          {!data ? (
            <p className="py-6 text-sm text-muted-foreground">Chargement…</p>
          ) : data.suiviATraiter.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Tout est à jour 🎉</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.suiviATraiter.map((s) => (
                <div
                  key={s.alternantProfilId}
                  className="flex items-center gap-3 rounded-xl border border-hairline px-3.5 py-3"
                >
                  <Avatar name={s.name} role="alternant" size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{s.name ?? '—'}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.reason}</div>
                  </div>
                  <StatusPill status={s.status} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Promotions */}
        <Panel className="p-6">
          <div className="text-[15px] font-semibold">Promotions</div>
          <div className="mb-4 text-xs text-muted-foreground">Progression moyenne par promo</div>
          {!data || data.promotions.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Aucune promotion.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {data.promotions.map((p) => (
                <div key={p.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{p.name}</span>
                    <span className="text-xs whitespace-nowrap text-muted-foreground">
                      {p.alternantCount} alternant{p.alternantCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ProgressBar pct={p.progressPct} className="flex-1" />
                    <span className="w-9 text-right text-[13px] font-semibold text-secondary-foreground">
                      {p.progressPct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: 'late' | 'incomplete' }) {
  const swatch =
    status === 'late' ? { bg: '#FBEBE3', text: '#B54F2C' } : { bg: '#F7EFDA', text: '#9A6B12' };
  return (
    <span
      className="inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
      style={{ background: swatch.bg, color: swatch.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: swatch.text }} />
      {status === 'late' ? 'En retard' : 'À compléter'}
    </span>
  );
}
