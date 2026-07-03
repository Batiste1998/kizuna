import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  GraduationCap,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { api, type PlatformOverview, type SuperOrganization, type SuperUser } from '#/lib/api';
import { useMe } from '#/lib/me-context';
import { primaryRole, roleMeta, timeAgo } from '#/lib/super';
import { Button } from '#/components/ui/button';
import { ProgressBar } from '#/components/ui/progress-bar';
import { Avatar, ForbiddenSuper, PageHead, Panel, RoleBadge, StatCard } from '#/components/super-ui';

export const Route = createFileRoute('/app/superadmin')({
  component: SuperDashboard,
});

const DIST_ROLES = ['admin', 'alternant', 'tuteur_entreprise', 'tuteur_pedagogique', 'support'];

function SuperDashboard() {
  const me = useMe();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [users, setUsers] = useState<SuperUser[]>([]);
  const [orgs, setOrgs] = useState<SuperOrganization[]>([]);

  function reload() {
    void api.superOverview().then(setOverview).catch(() => undefined);
    void api.superUsers().then(setUsers).catch(() => undefined);
    void api.superOrganizations().then(setOrgs).catch(() => undefined);
  }

  useEffect(() => {
    if (me.role === 'super_admin') reload();
  }, [me.role]);

  const pending = useMemo(() => users.filter((u) => u.banned), [users]);

  const activity = useMemo(() => {
    const events = [
      ...users.map((u) => ({
        kind: 'user' as const,
        at: u.createdAt,
        text: `${u.name ?? u.email} ajouté · ${roleMeta(primaryRole(u)).label}`,
      })),
      ...orgs.map((o) => ({
        kind: 'org' as const,
        at: o.createdAt,
        text: `École « ${o.name} » créée`,
      })),
    ];
    return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  }, [users, orgs]);

  const dist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of users) {
      const r = primaryRole(u);
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    const rows = DIST_ROLES.map((r) => ({ role: r, count: counts.get(r) ?? 0 }));
    const max = Math.max(1, ...rows.map((r) => r.count));
    return rows.map((r) => ({ ...r, pct: Math.round((r.count / max) * 100) }));
  }, [users]);

  if (me.role !== 'super_admin') return <ForbiddenSuper />;

  async function activate(u: SuperUser) {
    try {
      await api.updateSuperUser(u.id, { banned: false });
      toast.success(`Accès accordé à ${u.name ?? u.email}`);
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function reject(u: SuperUser) {
    try {
      await api.deleteSuperUser(u.id);
      toast.success('Compte refusé');
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
      <PageHead
        title="Vue d'ensemble"
        actions={
          <>
            <Link to="/app/ecoles">
              <Button variant="outline">
                <GraduationCap /> Nouvelle école
              </Button>
            </Link>
            <Link to="/app/users">
              <Button>
                <UserPlus /> Nouvel utilisateur
              </Button>
            </Link>
          </>
        }
      >
        Pilotez les écoles, les comptes et le support de la plateforme Kizuna.
      </PageHead>

      <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Utilisateurs" value={overview?.counts.users ?? '—'} sub="comptes créés" icon={<Users />} to="/app/users" />
        <StatCard label="Écoles partenaires" value={overview?.counts.organizations ?? '—'} sub="établissements" icon={<Building2 />} to="/app/ecoles" />
        <StatCard label="Administrateurs" value={overview?.counts.admins ?? '—'} sub="côté écoles" icon={<ShieldCheck />} />
        <StatCard label="Invitations en attente" value={overview?.counts.pending ?? '—'} sub="pas encore activées" icon={<Clock />} />
      </div>

      {/* Accès à valider */}
      <Panel className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-[15px] font-semibold">
            Accès à valider
            {pending.length > 0 && (
              <span className="rounded-full bg-status-amber px-2.5 py-0.5 text-[11.5px] font-bold text-status-amber-fg">
                {pending.length}
              </span>
            )}
          </div>
          <Link
            to="/app/users"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-strong hover:underline"
          >
            Tous les utilisateurs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          Comptes invités en attente d’activation — accordez l’accès pour qu’ils puissent se connecter.
        </p>

        {pending.length === 0 ? (
          <div className="flex items-center justify-center gap-2.5 py-8 text-sm font-medium text-status-teal-fg">
            <Check className="h-4 w-4" /> Tous les comptes ont accès à la plateforme.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {pending.slice(0, 5).map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline px-3.5 py-3"
              >
                <Avatar name={u.name} role={primaryRole(u)} />
                <div className="min-w-[150px] flex-1">
                  <div className="text-sm font-semibold">{u.name ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <RoleBadge role={primaryRole(u)} />
                <span className="text-xs whitespace-nowrap text-muted-foreground">
                  {u.organizations[0] ?? '—'}
                </span>
                <div className="flex flex-none items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => reject(u)}>
                    Refuser
                  </Button>
                  <Button size="sm" onClick={() => activate(u)}>
                    <Check /> Activer l’accès
                  </Button>
                </div>
              </div>
            ))}
            {pending.length > 5 && (
              <Link
                to="/app/users"
                className="py-1.5 text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                +{pending.length - 5} autres comptes en attente
              </Link>
            )}
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Activité récente */}
        <Panel className="p-6">
          <div className="text-[15px] font-semibold">Activité récente</div>
          <div className="mb-3 text-xs text-muted-foreground">Derniers évènements sur la plateforme</div>
          {activity.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Aucune activité récente.</p>
          ) : (
            <div className="flex flex-col">
              {activity.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-hairline py-2.5 last:border-0"
                >
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
                    {a.kind === 'org' ? (
                      <GraduationCap className="h-4 w-4" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 text-sm text-secondary-foreground">{a.text}</div>
                  <div className="text-xs whitespace-nowrap text-muted-foreground">{timeAgo(a.at)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Répartition par rôle */}
        <Panel className="p-6">
          <div className="text-[15px] font-semibold">Répartition par rôle</div>
          <div className="mb-4 text-xs text-muted-foreground">Comptes créés par type</div>
          <div className="flex flex-col gap-3.5">
            {dist.map((d) => {
              const meta = roleMeta(d.role);
              return (
                <div key={d.role}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-secondary-foreground">{meta.label}</span>
                    <span className="text-[13px] font-semibold text-muted-foreground">{d.count}</span>
                  </div>
                  <ProgressBar pct={d.pct} color={meta.swatch.text} />
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
