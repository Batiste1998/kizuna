import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Info, MapPin, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { api, type EstablishmentType, type SuperOrganization } from '#/lib/api';
import { useMe } from '#/lib/me-context';
import { initials } from '#/lib/super';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { ForbiddenSuper, PageHead } from '#/components/super-ui';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/app/ecoles')({
  component: EcolesPage,
});

function EcolesPage() {
  const me = useMe();
  const [orgs, setOrgs] = useState<SuperOrganization[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<SuperOrganization | 'new' | null>(null);

  function reload() {
    void api.superOrganizations().then(setOrgs).catch(() => undefined);
  }
  useEffect(() => {
    if (me.role === 'super_admin') reload();
  }, [me.role]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.type ?? '').toLowerCase().includes(q) ||
        (o.city ?? '').toLowerCase().includes(q),
    );
  }, [orgs, search]);

  if (me.role !== 'super_admin') return <ForbiddenSuper />;

  function confirmDelete(o: SuperOrganization) {
    toast(`Supprimer « ${o.name} » ?`, {
      description: 'Les comptes et données rattachés seront supprimés.',
      action: {
        label: 'Supprimer',
        onClick: async () => {
          try {
            await api.deleteSuperOrganization(o.id);
            toast.success('École supprimée');
            reload();
          } catch (err) {
            toast.error((err as Error).message);
          }
        },
      },
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-6 py-8">
      <PageHead
        title="Écoles"
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus /> Nouvelle école
          </Button>
        }
      >
        Créez les établissements partenaires et rattachez-leur des administrateurs. Seul le super admin
        peut créer une école.
      </PageHead>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une école…"
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-hairline bg-card px-5 py-16 text-center shadow-md">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Plus className="h-5 w-5" />
          </div>
          <div className="font-semibold">Aucune école</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Créez une nouvelle école pour commencer.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => (
            <div
              key={o.id}
              className="flex flex-col rounded-2xl border border-hairline bg-card p-5 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-base font-bold text-brand-strong">
                  {initials(o.name)}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditing(o)}
                    title="Modifier"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => confirmDelete(o)}
                    title="Supprimer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#FBEBE3] hover:text-[#B54F2C]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3.5 text-base font-semibold tracking-tight">{o.name}</div>
              <div className="mt-0.5 text-[13px] text-muted-foreground">{o.type ?? 'Établissement'}</div>
              {o.city && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {o.city}
                </div>
              )}
              <div className="my-3.5 h-px bg-hairline" />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold">{o.adminCount}</div>
                  <div className="text-[11px] whitespace-nowrap text-muted-foreground">admins</div>
                </div>
                <div className="border-x border-hairline">
                  <div className="text-lg font-bold">{o.memberCount}</div>
                  <div className="text-[11px] whitespace-nowrap text-muted-foreground">membres</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{o.alternantCount}</div>
                  <div className="text-[11px] whitespace-nowrap text-muted-foreground">alternants</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <OrgPanel
          org={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function OrgPanel({
  org,
  onClose,
  onSaved,
}: {
  org: SuperOrganization | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(org?.name ?? '');
  const [type, setType] = useState(org?.type ?? '');
  const [city, setCity] = useState(org?.city ?? '');
  const [busy, setBusy] = useState(false);
  const [types, setTypes] = useState<EstablishmentType[]>([]);
  const [addingType, setAddingType] = useState(false);
  const [newType, setNewType] = useState('');

  function loadTypes() {
    void api.superEstablishmentTypes().then(setTypes).catch(() => undefined);
  }
  useEffect(() => loadTypes(), []);

  async function addType() {
    const label = newType.trim();
    if (!label) return;
    try {
      const created = await api.createSuperEstablishmentType(label);
      setNewType('');
      setAddingType(false);
      loadTypes();
      setType(created.label);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function removeType(t: EstablishmentType) {
    try {
      await api.deleteSuperEstablishmentType(t.id);
      if (type === t.label) setType('');
      loadTypes();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function submit() {
    if (!name.trim()) {
      toast.error('Le nom est requis.');
      return;
    }
    setBusy(true);
    try {
      if (org) {
        await api.updateSuperOrganization(org.id, { name, type, city });
        toast.success('École mise à jour');
      } else {
        await api.createSuperOrganization({ name, type: type || undefined, city: city || undefined });
        toast.success('École créée');
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-[440px] max-w-[92vw] flex-col bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-hairline px-6 py-5">
          <div className="text-lg font-bold tracking-tight">
            {org ? 'Modifier l’école' : 'Nouvelle école'}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-secondary-foreground">
              Nom de l’école
            </span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="EPITECH Paris" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-secondary-foreground">
              Ville
            </span>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" />
          </label>

          <div>
            <span className="mb-2 block text-[12.5px] font-semibold text-secondary-foreground">
              Type d’établissement
            </span>
            <div className="grid grid-cols-2 gap-2">
              {types.map((t) => {
                const active = type === t.label;
                return (
                  <div key={t.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setType(active ? '' : t.label)}
                      className={cn(
                        'w-full rounded-xl border px-3 py-2.5 pr-7 text-left text-sm font-medium transition-colors',
                        active
                          ? 'border-brand bg-brand-soft text-brand-strong'
                          : 'border-hairline hover:border-brand',
                      )}
                    >
                      {t.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeType(t)}
                      title="Supprimer ce type"
                      aria-label={`Supprimer ${t.label}`}
                      className="absolute top-1/2 right-1.5 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-[#FBEBE3] hover:text-[#B54F2C] group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {addingType ? (
              <div className="mt-2 flex gap-2">
                <Input
                  autoFocus
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addType())}
                  placeholder="Nouveau type…"
                />
                <Button type="button" onClick={addType} disabled={!newType.trim()}>
                  Ajouter
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddingType(false);
                    setNewType('');
                  }}
                >
                  Annuler
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingType(true)}
                className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-strong hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un type
              </button>
            )}
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-brand-soft/60 px-3.5 py-3 text-[13px] text-brand-strong">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Une fois créée, vous pourrez rattacher des administrateurs à cette école depuis la page
              Utilisateurs.
            </span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-hairline px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Enregistrement…' : org ? 'Enregistrer' : 'Créer l’école'}
          </Button>
        </div>
      </aside>
    </div>
  );
}
