import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Building2, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, type AdminEntreprise } from '#/lib/api';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { PageHead } from '#/components/super-ui';
import { EntrepriseForm, useAdminData } from '#/components/admin-forms';
import { Slideover } from './app.admin.alternants';

export const Route = createFileRoute('/app/admin/entreprises')({
  component: AdminEntreprisesPage,
});

const PALETTE = [
  { bg: '#F3D9E0', text: '#B5566F' },
  { bg: '#DBE4F5', text: '#3B63CC' },
  { bg: '#D4EAE0', text: '#1F7A63' },
  { bg: '#FBEBE3', text: '#B54F2C' },
  { bg: '#E7E3F7', text: '#6B5BD2' },
  { bg: '#F7EFDA', text: '#9A6B12' },
];

function swatchFor(name: string) {
  const sum = [...name].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return PALETTE[sum % PALETTE.length];
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function AdminEntreprisesPage() {
  const { entreprises, alternants, reload } = useAdminData();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminEntreprise | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entreprises;
    return entreprises.filter(
      (e) => e.name.toLowerCase().includes(q) || (e.sector ?? '').toLowerCase().includes(q),
    );
  }, [entreprises, search]);

  function counts(name: string) {
    const subset = alternants.filter((a) => a.entrepriseName === name);
    const tuteurs = new Set(subset.map((a) => a.tuteurEntrepriseName).filter(Boolean));
    return { alternants: subset.length, tuteurs: tuteurs.size };
  }

  function confirmDelete(id: string, name: string) {
    toast(`Supprimer « ${name} » ?`, {
      action: {
        label: 'Supprimer',
        onClick: async () => {
          try {
            await api.deleteAdminEntreprise(id);
            toast.success('Entreprise supprimée');
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
        title="Entreprises"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nouvelle entreprise
          </Button>
        }
      >
        Les entreprises qui accueillent vos alternants en alternance.
      </PageHead>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une entreprise…"
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-hairline bg-card px-5 py-16 text-center shadow-md">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="font-semibold">Aucune entreprise</div>
          <div className="mt-1 text-sm text-muted-foreground">Ajoutez une entreprise d’accueil.</div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => {
            const sw = swatchFor(e.name);
            const c = counts(e.name);
            return (
              <div
                key={e.id}
                className="flex flex-col rounded-2xl border border-hairline bg-card p-5 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold"
                    style={{ background: sw.bg, color: sw.text }}
                  >
                    {initials(e.name)}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(e)}
                      title="Modifier"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => confirmDelete(e.id, e.name)}
                      title="Supprimer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-status-orange hover:text-status-orange-fg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3.5 text-base font-semibold">{e.name}</div>
                {e.sector && <div className="mt-0.5 text-[13px] text-muted-foreground">{e.sector}</div>}
                {e.city && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {e.city}
                  </div>
                )}
                <div className="mt-4 flex items-center gap-6 border-t border-hairline pt-3.5">
                  <Count value={c.alternants} label="alternant(s)" />
                  <Count value={c.tuteurs} label="tuteur(s)" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creating && (
        <Slideover
          title="Nouvelle entreprise"
          subtitle="Une entreprise qui accueille des alternants."
          onClose={() => setCreating(false)}
        >
          <EntrepriseForm onCreated={reload} onClose={() => setCreating(false)} />
        </Slideover>
      )}

      {editing && (
        <Slideover
          title="Modifier l’entreprise"
          subtitle={editing.name}
          onClose={() => setEditing(null)}
        >
          <EntrepriseForm entreprise={editing} onCreated={reload} onClose={() => setEditing(null)} />
        </Slideover>
      )}
    </div>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-lg font-bold tracking-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
