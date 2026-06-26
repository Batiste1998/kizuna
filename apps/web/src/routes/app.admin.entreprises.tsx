import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Building2, MapPin, Plus, Trash2 } from 'lucide-react';
import { api } from '#/lib/api';
import { Button } from '#/components/ui/button';
import { PageHead } from '#/components/super-ui';
import { EntrepriseForm, useAdminData } from '#/components/admin-forms';
import { Slideover } from './app.admin.alternants';

export const Route = createFileRoute('/app/admin/entreprises')({
  component: AdminEntreprisesPage,
});

function AdminEntreprisesPage() {
  const { entreprises, reload } = useAdminData();
  const [creating, setCreating] = useState(false);

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
        Les entreprises d’accueil partenaires de votre établissement.
      </PageHead>

      {entreprises.length === 0 ? (
        <div className="rounded-2xl border border-hairline bg-card px-5 py-16 text-center shadow-md">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="font-semibold">Aucune entreprise</div>
          <div className="mt-1 text-sm text-muted-foreground">Ajoutez une entreprise d’accueil.</div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entreprises.map((e) => (
            <div
              key={e.id}
              className="flex flex-col rounded-2xl border border-hairline bg-card p-5 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                  <Building2 className="h-5 w-5" />
                </div>
                <button
                  onClick={() => confirmDelete(e.id, e.name)}
                  title="Supprimer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#FBEBE3] hover:text-[#B54F2C]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3.5 text-base font-semibold">{e.name}</div>
              {e.sector && <div className="mt-0.5 text-[13px] text-muted-foreground">{e.sector}</div>}
              {e.city && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {e.city}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Slideover title="Nouvelle entreprise" onClose={() => setCreating(false)}>
          <EntrepriseForm onCreated={reload} onClose={() => setCreating(false)} />
        </Slideover>
      )}
    </div>
  );
}
