import { Fragment, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import type { AdminAlternant } from '#/lib/api';
import { Button } from '#/components/ui/button';
import { Avatar, PageHead, Panel, StatCard } from '#/components/super-ui';
import { AssociationEditor, useAdminData } from '#/components/admin-forms';
import { CheckCircle2, Link2, TriangleAlert } from 'lucide-react';

export const Route = createFileRoute('/app/admin/associations')({
  component: AdminAssociationsPage,
});

function complete(a: AdminAlternant) {
  return !!(a.entrepriseName && a.tuteurPedaName && a.tuteurEntrepriseName);
}

function Slot({ value }: { value: string | null }) {
  if (value) return <span className="text-sm text-secondary-foreground">{value}</span>;
  return <span className="text-sm text-muted-foreground/70 italic">Non assigné</span>;
}

function AdminAssociationsPage() {
  const { alternants, members, entreprises, reload } = useAdminData();
  const [editing, setEditing] = useState<string | null>(null);

  const { done, partial } = useMemo(() => {
    const done = alternants.filter(complete).length;
    return { done, partial: alternants.length - done };
  }, [alternants]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
      <PageHead title="Associations">
        Constituez les trinômes : rattachez à chaque alternant son tuteur pédagogique, son tuteur
        d’entreprise et son entreprise.
      </PageHead>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Trinômes" value={alternants.length} sub="alternants suivis" icon={<Link2 />} />
        <StatCard label="Complets" value={done} sub="trinômes constitués" icon={<CheckCircle2 />} />
        <StatCard label="À compléter" value={partial} sub="associations partielles" icon={<TriangleAlert />} />
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <th className="px-5 py-3">Alternant</th>
                <th className="px-4 py-3">Tuteur péda.</th>
                <th className="px-4 py-3">Tuteur entr.</th>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3 text-right">Trinôme</th>
              </tr>
            </thead>
            <tbody>
              {alternants.map((a) => (
                <Fragment key={a.alternantProfilId}>
                  <tr className="border-b border-hairline last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.name} role="alternant" size={34} />
                        <div>
                          <div className="text-sm font-semibold whitespace-nowrap">{a.name ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{a.promotionName ?? '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Slot value={a.tuteurPedaName} />
                    </td>
                    <td className="px-4 py-3">
                      <Slot value={a.tuteurEntrepriseName} />
                    </td>
                    <td className="px-4 py-3">
                      <Slot value={a.entrepriseName} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={complete(a) ? 'outline' : 'default'}
                        onClick={() =>
                          setEditing((id) => (id === a.alternantProfilId ? null : a.alternantProfilId))
                        }
                      >
                        {editing === a.alternantProfilId ? 'Fermer' : complete(a) ? 'Modifier' : 'Compléter'}
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
        {alternants.length === 0 && (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">
            Aucun alternant à associer.
          </div>
        )}
      </Panel>
    </div>
  );
}
