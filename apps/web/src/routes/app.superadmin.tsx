import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useSession } from '#/lib/auth-client';
import { api, type PlatformOverview, type SuperOrganization, type SuperUser } from '#/lib/api';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Centered } from '#/components/shell';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/app/superadmin')({
  component: SuperAdminPage,
});

function SuperAdminPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [orgs, setOrgs] = useState<SuperOrganization[]>([]);
  const [users, setUsers] = useState<SuperUser[]>([]);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  function reloadOrgs() {
    api
      .superOrganizations()
      .then(setOrgs)
      .catch(() => undefined);
  }
  function reloadUsers() {
    api
      .superUsers()
      .then(setUsers)
      .catch(() => undefined);
  }

  useEffect(() => {
    if (!session) return;
    api
      .superOverview()
      .then((o) => {
        setOverview(o);
        reloadOrgs();
        reloadUsers();
      })
      .catch(() => setForbidden(true));
  }, [session]);

  async function toggleBan(u: SuperUser) {
    try {
      await api.updateSuperUser(u.id, { banned: !u.banned });
      reloadUsers();
      toast.success(u.banned ? 'Utilisateur réactivé' : 'Utilisateur banni');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (isPending) return <Centered>Chargement…</Centered>;
  if (!session) return null;
  if (forbidden) {
    return (
      <Centered>
        <div className="text-center">
          <p className="font-medium">Espace réservé au super administrateur.</p>
          <Link to="/app" className="mt-4 inline-block text-sm text-brand hover:underline">
            ← Retour
          </Link>
        </div>
      </Centered>
    );
  }
  if (!overview) return <Centered>Chargement…</Centered>;

  return (
    <main data-role="super_admin" className="min-h-screen">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <Link to="/app" className="text-xs text-muted-foreground hover:text-brand">
            ← Espace
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Super administration</h1>
        </div>
      </header>

      <section className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Écoles" value={overview.counts.organizations} />
          <Kpi label="Utilisateurs" value={overview.counts.users} />
          <Kpi label="Alternants" value={overview.counts.alternants} />
          <Kpi label="Tickets ouverts" value={overview.counts.openTickets} />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold tracking-tight">Écoles</h2>
          <OrgForm onCreated={reloadOrgs} />
          <div className="grid gap-3 sm:grid-cols-3">
            {orgs.map((o) => (
              <div key={o.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="font-semibold">{o.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[o.type, o.city].filter(Boolean).join(' · ') || '—'}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {o.memberCount} membre(s) · {o.alternantCount} alternant(s)
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold tracking-tight">Utilisateurs</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-semibold">Utilisateur</th>
                  <th className="px-4 py-2 font-semibold">Rôle plateforme</th>
                  <th className="px-4 py-2 font-semibold">Rôles établissement</th>
                  <th className="px-4 py-2 font-semibold">Statut</th>
                  <th className="px-4 py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{u.role}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {u.memberRoles.length ? u.memberRoles.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          u.banned ? 'bg-[#FBEBE3] text-[#B54F2C]' : 'bg-[#E4F2EC] text-[#2C7A63]',
                        )}
                      >
                        {u.banned ? 'Banni' : 'Actif'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="outline" onClick={() => toggleBan(u)}>
                        {u.banned ? 'Réactiver' : 'Bannir'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function OrgForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createSuperOrganization({ name, type: type || undefined, city: city || undefined });
      setName('');
      setType('');
      setCity('');
      onCreated();
      toast.success('École créée');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"
    >
      <Input
        required
        maxLength={200}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de l’école"
      />
      <Input
        value={type}
        onChange={(e) => setType(e.target.value)}
        placeholder="Type (CFA, université…)"
      />
      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" />
      <Button type="submit" disabled={busy || !name}>
        Créer
      </Button>
    </form>
  );
}
