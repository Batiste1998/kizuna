import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Briefcase, GraduationCap, Link2, Plus, Users } from 'lucide-react';
import type { AdminAlternant, AlternantSuivi } from '#/lib/api';
import { Button } from '#/components/ui/button';
import { Avatar, PageHead } from '#/components/super-ui';
import { AssociationEditor, selectClass, useAdminData } from '#/components/admin-forms';
import { Slideover } from './app.admin.alternants';

export const Route = createFileRoute('/app/admin/associations')({
  component: AdminAssociationsPage,
});

const SUIVI_META: Record<AlternantSuivi, { label: string; bg: string; text: string }> = {
  a_jour: { label: 'À jour', bg: '#E4F2EC', text: '#2C7A63' },
  en_retard: { label: 'En retard', bg: '#FBE5E0', text: '#C0492C' },
  a_completer: { label: 'À compléter', bg: '#F7EFDA', text: '#9A6B12' },
};

function AdminAssociationsPage() {
  const { alternants, members, entreprises, reload } = useAdminData();
  const [editing, setEditing] = useState<AdminAlternant | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-6 py-8">
      <PageHead
        title="Associations"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nouvelle association
          </Button>
        }
      >
        Le trinôme de chaque alternant : tuteur pédagogique, tuteur d’entreprise et entreprise.
        <br />
        C’est le lien que Kizuna garde à jour.
      </PageHead>

      <div className="space-y-3">
        {alternants.map((a) => {
          const suivi = SUIVI_META[a.suivi];
          return (
            <div
              key={a.alternantProfilId}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-hairline bg-card p-4 shadow-md"
            >
              <div className="flex min-w-[200px] items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                <Avatar name={a.name} role="alternant" size={36} />
                <div>
                  <div className="text-sm font-semibold whitespace-nowrap">{a.name ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{a.promotionName ?? '—'}</div>
                </div>
              </div>

              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />

              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <TrinomeField
                  label="Tuteur pédagogique"
                  icon={<GraduationCap className="h-3.5 w-3.5" />}
                  value={a.tuteurPedaName}
                />
                <TrinomeField
                  label="Tuteur d'entreprise"
                  icon={<Users className="h-3.5 w-3.5" />}
                  value={a.tuteurEntrepriseName}
                />
                <TrinomeField
                  label="Entreprise"
                  icon={<Briefcase className="h-3.5 w-3.5" />}
                  value={a.entrepriseName}
                />
              </div>

              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap"
                style={{ background: suivi.bg, color: suivi.text }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: suivi.text }} />
                {suivi.label}
              </span>

              <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                Modifier
              </Button>
            </div>
          );
        })}
        {alternants.length === 0 && (
          <div className="rounded-2xl border border-hairline bg-card p-14 text-center text-sm text-muted-foreground shadow-md">
            Aucun alternant à associer.
          </div>
        )}
      </div>

      {editing && (
        <Slideover
          title="Modifier le trinôme"
          subtitle={editing.name ?? undefined}
          onClose={() => setEditing(null)}
        >
          <AssociationEditor
            alternantProfilId={editing.alternantProfilId}
            members={members}
            entreprises={entreprises}
            initial={{
              tuteurPedaName: editing.tuteurPedaName,
              tuteurEntrepriseName: editing.tuteurEntrepriseName,
              entrepriseName: editing.entrepriseName,
            }}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        </Slideover>
      )}

      {creating && (
        <Slideover
          title="Nouvelle association"
          subtitle="Choisissez un alternant et constituez son trinôme."
          onClose={() => setCreating(false)}
        >
          <NewAssociation
            alternants={alternants}
            onPick={(a) => {
              setCreating(false);
              setEditing(a);
            }}
          />
        </Slideover>
      )}
    </div>
  );
}

function TrinomeField({
  label,
  icon,
  value,
}: {
  label: string;
  icon: React.ReactNode;
  value: string | null;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
        {label}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-hairline bg-card px-3 py-2">
        <span className="text-muted-foreground">{icon}</span>
        {value ? (
          <span className="truncate text-sm font-medium">{value}</span>
        ) : (
          <span className="text-sm text-muted-foreground/60 italic">À assigner</span>
        )}
      </div>
    </div>
  );
}

function NewAssociation({
  alternants,
  onPick,
}: {
  alternants: AdminAlternant[];
  onPick: (a: AdminAlternant) => void;
}) {
  const [id, setId] = useState('');
  // Surface incomplete trinômes first — they are the ones that need attention.
  const sorted = useMemo(
    () =>
      [...alternants].sort((a, b) => (a.suivi === 'a_completer' ? -1 : 0) - (b.suivi === 'a_completer' ? -1 : 0)),
    [alternants],
  );
  const chosen = alternants.find((a) => a.alternantProfilId === id);

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-semibold text-secondary-foreground">
          Alternant
        </span>
        <select className={selectClass} value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">— Choisir un alternant —</option>
          {sorted.map((a) => (
            <option key={a.alternantProfilId} value={a.alternantProfilId}>
              {a.name} {a.suivi === 'a_completer' ? '· à compléter' : ''}
            </option>
          ))}
        </select>
      </label>
      <Button disabled={!chosen} onClick={() => chosen && onPick(chosen)}>
        Constituer le trinôme
      </Button>
    </div>
  );
}
