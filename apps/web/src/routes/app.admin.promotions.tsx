import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { GraduationCap, Plus } from 'lucide-react';
import { Button } from '#/components/ui/button';
import { PageHead } from '#/components/super-ui';
import { PromotionForm, useAdminData } from '#/components/admin-forms';
import { Slideover } from './app.admin.alternants';

export const Route = createFileRoute('/app/admin/promotions')({
  component: AdminPromotionsPage,
});

function AdminPromotionsPage() {
  const { promotions, alternants, reload } = useAdminData();
  const [creating, setCreating] = useState(false);

  const countByPromo = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of alternants) {
      if (a.promotionName) m.set(a.promotionName, (m.get(a.promotionName) ?? 0) + 1);
    }
    return m;
  }, [alternants]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-6 py-8">
      <PageHead
        title="Promotions"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nouvelle promotion
          </Button>
        }
      >
        Les promotions (référentiels RNCP) de votre établissement.
      </PageHead>

      {promotions.length === 0 ? (
        <div className="rounded-2xl border border-hairline bg-card px-5 py-16 text-center shadow-md">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="font-semibold">Aucune promotion</div>
          <div className="mt-1 text-sm text-muted-foreground">Créez une promotion pour commencer.</div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map((p) => (
            <div
              key={p.id}
              className="flex flex-col rounded-2xl border border-hairline bg-card p-5 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="mt-3.5 text-base font-semibold">{p.name}</div>
              <div className="mt-0.5 text-[13px] text-muted-foreground">
                {p.rncpLevel ? `Niveau RNCP ${p.rncpLevel}` : 'Niveau —'}
              </div>
              <div className="mt-3 text-sm font-semibold text-brand-strong">
                {countByPromo.get(p.name) ?? 0}{' '}
                <span className="font-medium text-muted-foreground">
                  alternant{(countByPromo.get(p.name) ?? 0) > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Slideover title="Nouvelle promotion" onClose={() => setCreating(false)}>
          <PromotionForm onCreated={reload} onClose={() => setCreating(false)} />
        </Slideover>
      )}
    </div>
  );
}
