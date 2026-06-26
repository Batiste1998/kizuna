import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Check, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import {
  api,
  type CreatableSuperRole,
  type SuperOrganization,
  type SuperUser,
} from '#/lib/api';
import { useMe } from '#/lib/me-context';
import { formatDate, primaryRole, roleMeta } from '#/lib/super';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import {
  Avatar,
  ForbiddenSuper,
  PageHead,
  Panel,
  RoleBadge,
  StatCard,
  StatusBadge,
} from '#/components/super-ui';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/app/users')({
  component: UsersPage,
});

const ROLE_OPTIONS: { key: CreatableSuperRole; needsOrg: boolean }[] = [
  { key: 'admin', needsOrg: true },
  { key: 'tuteur_pedagogique', needsOrg: true },
  { key: 'tuteur_entreprise', needsOrg: true },
  { key: 'support', needsOrg: false },
  { key: 'super_admin', needsOrg: false },
];

const FILTERS = ['all', 'admin', 'tuteur_pedagogique', 'tuteur_entreprise', 'alternant', 'support'];

function UsersPage() {
  const me = useMe();
  const [users, setUsers] = useState<SuperUser[]>([]);
  const [orgs, setOrgs] = useState<SuperOrganization[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(false);

  function reload() {
    void api.superUsers().then(setUsers).catch(() => undefined);
    void api.superOrganizations().then(setOrgs).catch(() => undefined);
  }
  useEffect(() => {
    if (me.role === 'super_admin') reload();
  }, [me.role]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const u of users) c.set(primaryRole(u), (c.get(primaryRole(u)) ?? 0) + 1);
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter !== 'all' && primaryRole(u) !== filter) return false;
      if (!q) return true;
      return (u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, search, filter]);

  if (me.role !== 'super_admin') return <ForbiddenSuper />;

  const adminCount = users.filter((u) => u.memberRoles.some((r) => r === 'admin' || r === 'owner')).length;
  const pendingCount = users.filter((u) => u.banned).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((u) => u.id)),
    );
  }

  async function activate(u: SuperUser) {
    try {
      await api.updateSuperUser(u.id, { banned: false });
      toast.success(`Accès accordé à ${u.name ?? u.email}`);
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function remove(u: SuperUser) {
    try {
      await api.deleteSuperUser(u.id);
      toast.success('Utilisateur supprimé');
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(u.id);
        return next;
      });
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function deleteSelected() {
    const ids = [...selected];
    await Promise.all(ids.map((id) => api.deleteSuperUser(id).catch(() => undefined)));
    toast.success(`${ids.length} compte(s) supprimé(s)`);
    setSelected(new Set());
    reload();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
      <PageHead
        title="Utilisateurs"
        actions={
          <Button onClick={() => setPanelOpen(true)}>
            <UserPlus /> Nouvel utilisateur
          </Button>
        }
      >
        Créez et gérez les comptes de la plateforme. Les nouveaux comptes sont créés{' '}
        <strong className="font-semibold text-secondary-foreground">sans accès</strong> : l’utilisateur
        ne peut pas encore se connecter tant que vous ne l’avez pas activé.
      </PageHead>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Utilisateurs" value={users.length} sub="comptes créés" icon={<Users />} />
        <StatCard label="Administrateurs" value={adminCount} sub="côté écoles" icon={<Users />} />
        <StatCard label="En attente" value={pendingCount} sub="à activer" icon={<UserPlus />} />
        <StatCard label="Écoles" value={orgs.length} sub="partenaires" icon={<Users />} />
      </div>

      {/* Recherche + filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un nom ou un email…"
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => {
            const active = filter === f;
            const label = f === 'all' ? 'Tous' : roleMeta(f).label;
            const count = f === 'all' ? users.length : counts.get(f) ?? 0;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'border-transparent bg-brand-soft text-brand-strong'
                    : 'border-hairline bg-card text-secondary-foreground hover:border-brand',
                )}
              >
                {label}
                <span className={cn('text-[11px]', active ? 'text-brand-strong/70' : 'text-muted-foreground')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <Panel className="overflow-hidden">
        {selected.size > 0 && (
          <div className="flex items-center justify-between bg-brand-soft px-5 py-2.5">
            <div className="text-[13px] font-semibold text-brand-strong">
              {selected.size} sélectionné(s)
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
                Annuler
              </Button>
              <Button size="sm" variant="destructive" onClick={deleteSelected}>
                <Trash2 /> Supprimer
              </Button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <th className="py-3 pr-2 pl-5">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
                  />
                </th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">École(s)</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Créé le</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-hairline last:border-0 hover:bg-muted/40">
                  <td className="py-3 pr-2 pl-5">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggle(u.id)}
                      className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} role={primaryRole(u)} size={34} />
                      <div>
                        <div className="text-sm font-semibold whitespace-nowrap">{u.name ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={primaryRole(u)} />
                  </td>
                  <td className="px-4 py-3">
                    {u.organizations.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {u.organizations.slice(0, 2).map((o) => (
                          <span
                            key={o}
                            className="rounded-md border border-hairline bg-muted px-2 py-0.5 text-xs font-medium text-secondary-foreground whitespace-nowrap"
                          >
                            {o}
                          </span>
                        ))}
                        {u.organizations.length > 2 && (
                          <span className="text-xs font-semibold text-muted-foreground">
                            +{u.organizations.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge banned={u.banned} />
                  </td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {u.banned && (
                        <Button size="sm" onClick={() => activate(u)}>
                          <Check /> Activer
                        </Button>
                      )}
                      <button
                        onClick={() => remove(u)}
                        title="Supprimer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#FBEBE3] hover:text-[#B54F2C]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Users className="h-5 w-5" />
            </div>
            <div className="font-semibold">Aucun utilisateur trouvé</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Essayez d’ajuster votre recherche ou vos filtres.
            </div>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-hairline px-5 py-3 text-[13px] text-muted-foreground">
          <span>
            {filtered.length} utilisateur{filtered.length > 1 ? 's' : ''}
          </span>
        </div>
      </Panel>

      {panelOpen && (
        <CreateUserPanel
          orgs={orgs}
          onClose={() => setPanelOpen(false)}
          onCreated={() => {
            setPanelOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

function CreateUserPanel({
  orgs,
  onClose,
  onCreated,
}: {
  orgs: SuperOrganization[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CreatableSuperRole>('admin');
  const [orgIds, setOrgIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const needsOrg = ROLE_OPTIONS.find((r) => r.key === role)?.needsOrg ?? false;

  function toggleOrg(id: string) {
    setOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    const name = `${prenom} ${nom}`.trim();
    if (!name || !email) {
      toast.error('Renseignez le nom et l’email.');
      return;
    }
    if (needsOrg && orgIds.size === 0) {
      toast.error('Sélectionnez au moins une école pour ce rôle.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.createSuperUser({
        name,
        email,
        role,
        organizationIds: needsOrg ? [...orgIds] : undefined,
      });
      toast.success('Compte créé', {
        description: `Mot de passe temporaire : ${res.temporaryPassword}`,
        duration: 12000,
      });
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-[460px] max-w-[92vw] flex-col bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-hairline px-6 py-5">
          <div>
            <div className="text-lg font-bold tracking-tight">Nouvel utilisateur</div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              Le compte est créé sans accès — activez-le ensuite.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom">
              <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Camille" />
            </Field>
            <Field label="Nom">
              <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Moreau" />
            </Field>
          </div>
          <Field label="Adresse email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="camille.moreau@ecole.fr"
            />
          </Field>

          <div>
            <div className="mb-2 text-[12.5px] font-semibold text-secondary-foreground">Rôle</div>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((opt) => {
                const meta = roleMeta(opt.key);
                const active = role === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setRole(opt.key)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'border-brand bg-brand-soft text-brand-strong'
                        : 'border-hairline hover:border-brand',
                    )}
                  >
                    <span
                      className="h-2 w-2 flex-none rounded-full"
                      style={{ background: meta.swatch.text }}
                    />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {needsOrg && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-secondary-foreground">
                  École(s) liée(s)
                </span>
                <span className="text-xs text-muted-foreground">{orgIds.size} sélectionnée(s)</span>
              </div>
              {orgs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune école — créez-en une d’abord.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {orgs.map((o) => {
                    const sel = orgIds.has(o.id);
                    return (
                      <button
                        key={o.id}
                        onClick={() => toggleOrg(o.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors',
                          sel
                            ? 'border-brand bg-brand-soft text-brand-strong'
                            : 'border-hairline hover:border-brand',
                        )}
                      >
                        {sel && <Check className="h-3.5 w-3.5" />}
                        {o.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-hairline px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={busy}>
            <UserPlus /> {busy ? 'Création…' : 'Créer le compte'}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-secondary-foreground">{label}</span>
      {children}
    </label>
  );
}
