import { Fragment, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Search, UserPlus, X } from 'lucide-react';
import type { AdminAlternant } from '#/lib/api';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Avatar, PageHead, Panel } from '#/components/super-ui';
import { AssociationEditor, MemberForm, useAdminData } from '#/components/admin-forms';

export const Route = createFileRoute('/app/admin/alternants')({
  component: AdminAlternantsPage,
});

function assocComplete(a: AdminAlternant) {
  return !!(a.entrepriseName && a.tuteurPedaName && a.tuteurEntrepriseName);
}

function AdminAlternantsPage() {
  const { alternants, members, entreprises, promotions, reload } = useAdminData();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return alternants;
    return alternants.filter(
      (a) => (a.name ?? '').toLowerCase().includes(q) || (a.email ?? '').toLowerCase().includes(q),
    );
  }, [alternants, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
      <PageHead
        title="Alternants"
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus /> Nouvel alternant
          </Button>
        }
      >
        Les alternants suivis par votre établissement et leur trinôme.
      </PageHead>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un alternant…"
          className="pl-10"
        />
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <th className="px-5 py-3">Alternant</th>
                <th className="px-4 py-3">Promotion</th>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Trinôme</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <Fragment key={a.alternantProfilId}>
                  <tr className="border-b border-hairline last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.name} role="alternant" size={34} />
                        <div>
                          <div className="text-sm font-semibold whitespace-nowrap">{a.name ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.promotionName ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.entrepriseName ?? '—'}</td>
                    <td className="px-4 py-3">
                      {assocComplete(a) ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F2EC] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#2C7A63]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#2C7A63]" /> Complet
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7EFDA] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#9A6B12]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#9A6B12]" /> À compléter
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditing((id) => (id === a.alternantProfilId ? null : a.alternantProfilId))
                        }
                      >
                        {editing === a.alternantProfilId ? 'Fermer' : 'Trinôme'}
                      </Button>
                    </td>
                  </tr>
                  {editing === a.alternantProfilId && (
                    <tr className="border-b border-hairline">
                      <td colSpan={5} className="bg-muted/40 px-5 py-4">
                        <AssociationEditor
                          alternantProfilId={a.alternantProfilId}
                          members={members}
                          entreprises={entreprises}
                          onSaved={() => {
                            setEditing(null);
                            reload();
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">
            Aucun alternant pour le moment.
          </div>
        )}
      </Panel>

      {creating && (
        <Slideover title="Nouvel alternant" subtitle="Créez le compte et rattachez-le à une promotion." onClose={() => setCreating(false)}>
          <MemberForm
            promotions={promotions}
            defaultRole="alternant"
            onCreated={reload}
            onClose={() => setCreating(false)}
          />
        </Slideover>
      )}
    </div>
  );
}

export function Slideover({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-[460px] max-w-[92vw] flex-col bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-hairline px-6 py-5">
          <div>
            <div className="text-lg font-bold tracking-tight">{title}</div>
            {subtitle && <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </aside>
    </div>
  );
}
