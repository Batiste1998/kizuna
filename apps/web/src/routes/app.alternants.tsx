import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useSession } from '#/lib/auth-client';
import { api, type TutorAlternant } from '#/lib/api';
import { EVALUATOR_LABELS } from '#/lib/levels';
import { Centered } from '#/components/shell';

export const Route = createFileRoute('/app/alternants')({
  component: AlternantsPage,
});

function AlternantsPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [list, setList] = useState<TutorAlternant[] | null>(null);

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  useEffect(() => {
    if (!session) return;
    api
      .getMyAlternants()
      .then(setList)
      .catch(() => setList([]));
  }, [session]);

  if (isPending || (!list && session)) return <Centered>Chargement…</Centered>;
  if (!session) return null;

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <Link to="/app" className="text-xs text-muted-foreground hover:text-brand">
            ← Espace
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Mes alternants</h1>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-8">
        {list && list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Aucun alternant ne vous est rattaché. Cet espace est destiné aux tuteurs.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list?.map((a) => {
              const pct =
                a.progress.total > 0 ? (a.progress.evaluated / a.progress.total) * 100 : 0;
              return (
                <div
                  key={a.alternantProfilId}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">{a.name}</h2>
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                    </div>
                    <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong">
                      {EVALUATOR_LABELS[a.myRole]}
                    </span>
                  </div>

                  <dl className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                    {a.promotionName && <div>Promotion : {a.promotionName}</div>}
                    {a.entrepriseName && <div>Entreprise : {a.entrepriseName}</div>}
                  </dl>

                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Compétences évaluées</span>
                      <span>
                        {a.progress.evaluated}/{a.progress.total}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link
                      to="/app/alternants/$alternantId/competences"
                      params={{ alternantId: a.alternantProfilId }}
                      className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-brand"
                    >
                      Compétences
                    </Link>
                    <Link
                      to="/app/alternants/$alternantId/journal"
                      params={{ alternantId: a.alternantProfilId }}
                      className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-brand"
                    >
                      Journal
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
