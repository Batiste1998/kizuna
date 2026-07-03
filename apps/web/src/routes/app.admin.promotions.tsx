import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ArrowRight, GraduationCap, Plus } from 'lucide-react';
import type { AdminPromotion } from '#/lib/api';
import { Button } from '#/components/ui/button';
import { ProgressBar } from '#/components/ui/progress-bar';
import { PageHead } from '#/components/super-ui';
import { PromotionForm, useAdminData } from '#/components/admin-forms';
import { Slideover } from './app.admin.alternants';

export const Route = createFileRoute('/app/admin/promotions')({
  component: AdminPromotionsPage,
});

const BAC_BY_LEVEL: Record<number, string> = { 5: 'Bac+2', 6: 'Bac+3/4', 7: 'Bac+5', 8: 'Bac+8' };

function periodLabel(p: AdminPromotion): string | null {
  const y = (iso: string | null) => (iso ? new Date(iso).getFullYear() : null);
  const a = y(p.periodStart);
  const b = y(p.periodEnd);
  if (a && b) return `${a} – ${b}`;
  return a ? `${a}` : null;
}

function AdminPromotionsPage() {
  const { promotions, alternants, reload } = useAdminData();
  const [creating, setCreating] = useState(false);

  const statsByPromo = useMemo(() => {
    const m = new Map<string, { count: number; progress: number }>();
    for (const p of promotions) {
      const subset = alternants.filter((a) => a.promotionName === p.name);
      const progress = subset.length
        ? Math.round(subset.reduce((s, a) => s + a.progressPct, 0) / subset.length)
        : 0;
      m.set(p.id, { count: subset.length, progress });
    }
    return m;
  }, [promotions, alternants]);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-6 py-8">
      <PageHead
        title="Promotions"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nouvelle promotion
          </Button>
        }
      >
        Les sessions de formation de votre établissement et leur avancement.
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
        <div className="grid gap-4 sm:grid-cols-2">
          {promotions.map((p) => {
            const s = statsByPromo.get(p.id) ?? { count: 0, progress: 0 };
            const period = periodLabel(p);
            return (
              <div
                key={p.id}
                className="flex flex-col rounded-2xl border border-hairline bg-card p-5 shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold tracking-tight">{p.name}</div>
                    {period && <div className="mt-0.5 text-[13px] text-muted-foreground">{period}</div>}
                  </div>
                  {p.rncpLevel && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                      {BAC_BY_LEVEL[p.rncpLevel] ?? `Niveau ${p.rncpLevel}`}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">
                    {s.count} alternant{s.count > 1 ? 's' : ''} · Progression {s.progress}%
                  </span>
                </div>
                <ProgressBar pct={s.progress} className="mt-2" />

                <button
                  onClick={() =>
                    toast.info('Gestion du référentiel de compétences — bientôt disponible.')
                  }
                  className="mt-4 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand-strong hover:underline"
                >
                  Gérer le référentiel de compétences <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {creating && (
        <Slideover
          title="Nouvelle promotion"
          subtitle="Une session de formation de l’école."
          onClose={() => setCreating(false)}
        >
          <PromotionForm onCreated={reload} onClose={() => setCreating(false)} />
        </Slideover>
      )}
    </div>
  );
}
