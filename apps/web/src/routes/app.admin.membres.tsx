import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api, type AdminMember } from '#/lib/api';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Avatar, PageHead, Panel } from '#/components/super-ui';
import { MemberEditForm, MemberForm, useAdminData } from '#/components/admin-forms';
import { Slideover } from './app.admin.alternants';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/app/admin/membres')({
  component: AdminMembresPage,
});

const TYPE_META: Record<string, { label: string; bg: string; text: string }> = {
  tuteur_pedagogique: { label: 'Pédagogique', bg: '#EAF0F8', text: '#2E5288' },
  tuteur_entreprise: { label: 'Entreprise', bg: '#FBEBE3', text: '#B54F2C' },
};

const FILTERS: Array<{ key: 'all' | 'tuteur_pedagogique' | 'tuteur_entreprise'; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'tuteur_pedagogique', label: 'Pédagogiques' },
  { key: 'tuteur_entreprise', label: 'Entreprise' },
];

function AdminMembresPage() {
  const { members, alternants, promotions, reload } = useAdminData();
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'tuteur_pedagogique' | 'tuteur_entreprise'>('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminMember | null>(null);

  function confirmDelete(m: AdminMember) {
    toast(`Retirer « ${m.name ?? m.email} » de l’établissement ?`, {
      action: {
        label: 'Retirer',
        onClick: async () => {
          try {
            await api.deleteAdminMember(m.id);
            toast.success('Membre retiré de l’établissement');
            reload();
          } catch (err) {
            toast.error((err as Error).message);
          }
        },
      },
    });
  }

  useEffect(() => {
    void api
      .adminSchools()
      .then((d) => setSchoolName(d.schools.find((s) => s.id === d.activeId)?.name ?? null))
      .catch(() => undefined);
  }, []);

  // Only tutors are surfaced here; admins/alternants live on their own pages.
  const tutors = useMemo(
    () => members.filter((m) => m.role === 'tuteur_pedagogique' || m.role === 'tuteur_entreprise'),
    [members],
  );

  const enriched = useMemo(
    () =>
      tutors.map((m) => {
        const isPeda = m.role === 'tuteur_pedagogique';
        const suivis = alternants.filter((a) =>
          isPeda ? a.tuteurPedaName === m.name : a.tuteurEntrepriseName === m.name,
        );
        const rattachement = isPeda
          ? (schoolName ?? '—')
          : (suivis.find((a) => a.entrepriseName)?.entrepriseName ?? '—');
        return { ...m, rattachement, suivis: suivis.length };
      }),
    [tutors, alternants, schoolName],
  );

  const counts = useMemo(() => {
    const c = { all: tutors.length, tuteur_pedagogique: 0, tuteur_entreprise: 0 };
    for (const m of tutors) {
      if (m.role === 'tuteur_pedagogique') c.tuteur_pedagogique++;
      else if (m.role === 'tuteur_entreprise') c.tuteur_entreprise++;
    }
    return c;
  }, [tutors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((m) => {
      if (filter !== 'all' && m.role !== filter) return false;
      if (!q) return true;
      return (m.name ?? '').toLowerCase().includes(q) || (m.email ?? '').toLowerCase().includes(q);
    });
  }, [enriched, search, filter]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
      <PageHead
        title="Membres"
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus /> Nouveau membre
          </Button>
        }
      >
        Les tuteurs pédagogiques de l’école et les tuteurs d’entreprise qui encadrent vos alternants.
      </PageHead>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un membre…"
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'border-transparent bg-foreground text-background'
                    : 'border-hairline bg-card text-secondary-foreground hover:border-brand',
                )}
              >
                {f.label}
                <span className={cn('text-[11px]', active ? 'text-background/70' : 'text-muted-foreground')}>
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <th className="px-5 py-3">Membre</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Rattachement</th>
                <th className="px-4 py-3">Alternants suivis</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const type = TYPE_META[m.role];
                return (
                  <tr key={m.id} className="border-b border-hairline last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} role={m.role} size={36} />
                        <div>
                          <div className="text-sm font-semibold whitespace-nowrap">{m.name ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {type && (
                        <span
                          className="inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
                          style={{ background: type.bg, color: type.text }}
                        >
                          {type.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{m.rattachement}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{m.suivis}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(m)}
                          title="Modifier"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(m)}
                          title="Retirer de l’établissement"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-status-orange hover:text-status-orange-fg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">Aucun membre.</div>
        )}
      </Panel>

      {creating && (
        <Slideover
          title="Nouveau membre"
          subtitle="Créez un compte et rattachez-le à votre établissement."
          onClose={() => setCreating(false)}
        >
          <MemberForm
            promotions={promotions}
            defaultRole="tuteur_pedagogique"
            onCreated={reload}
            onClose={() => setCreating(false)}
          />
        </Slideover>
      )}

      {editing && (
        <Slideover
          title="Modifier le membre"
          subtitle={editing.name ?? editing.email ?? ''}
          onClose={() => setEditing(null)}
        >
          <MemberEditForm member={editing} onSaved={reload} onClose={() => setEditing(null)} />
        </Slideover>
      )}
    </div>
  );
}
