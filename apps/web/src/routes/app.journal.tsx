import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useSession } from '#/lib/auth-client';
import { api } from '#/lib/api';
import { JournalPanel } from '#/components/journal-panel';
import { Centered } from '#/components/shell';
import { PageShell } from '#/components/super-ui';

export const Route = createFileRoute('/app/journal')({
  component: MyJournalPage,
});

function MyJournalPage() {
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
          <p className="mt-1 text-sm text-muted-foreground">
            Le journal personnel est réservé aux alternants.
          </p>
          <Link to="/app" className="mt-4 inline-block text-sm text-brand hover:underline">
            ← Retour
          </Link>
        </div>
      </Centered>
    );
  }
  if (!profilId) return <Centered>Chargement…</Centered>;

  return (
    <PageShell title="Mon journal d’activités" maxWidth="max-w-3xl">
        <JournalPanel alternantProfilId={profilId} />
    </PageShell>
  );
}
