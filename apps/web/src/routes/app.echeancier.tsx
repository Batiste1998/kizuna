import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useSession } from '#/lib/auth-client';
import { api } from '#/lib/api';
import { EcheancierPanel } from '#/components/echeancier-panel';
import { Centered } from '#/components/shell';

export const Route = createFileRoute('/app/echeancier')({
  component: MyEcheancierPage,
});

function MyEcheancierPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [profilId, setProfilId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  useEffect(() => {
    if (!session) return;
    api
      .myAlternantProfile()
      .then((p) => setProfilId(p.alternantProfilId))
      .catch((e: Error) => setError(e.message));
  }, [session]);

  if (isPending) return <Centered>Chargement…</Centered>;
  if (!session) return null;
  if (error) {
    return (
      <Centered>
        <div className="text-center">
          <p className="font-medium">{error}</p>
          <Link to="/app" className="mt-4 inline-block text-sm text-brand hover:underline">
            ← Retour
          </Link>
        </div>
      </Centered>
    );
  }
  if (!profilId) return <Centered>Chargement…</Centered>;

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link to="/app" className="text-xs text-muted-foreground hover:text-brand">
            ← Espace
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Échéancier</h1>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-6 py-8">
        <EcheancierPanel alternantProfilId={profilId} />
      </section>
    </main>
  );
}
