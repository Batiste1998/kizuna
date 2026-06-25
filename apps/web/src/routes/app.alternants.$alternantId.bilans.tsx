import { useEffect } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useSession } from '#/lib/auth-client';
import { BilansPanel } from '#/components/bilans-panel';
import { Centered } from '#/components/shell';

export const Route = createFileRoute('/app/alternants/$alternantId/bilans')({
  component: AlternantBilansPage,
});

function AlternantBilansPage() {
  const { alternantId } = Route.useParams();
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  if (isPending) return <Centered>Chargement…</Centered>;
  if (!session) return null;

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link to="/app/alternants" className="text-xs text-muted-foreground hover:text-brand">
            ← Mes alternants
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Bilans de l’alternant</h1>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-6 py-8">
        <BilansPanel alternantProfilId={alternantId} />
      </section>
    </main>
  );
}
