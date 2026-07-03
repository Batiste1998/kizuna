import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useSession } from '#/lib/auth-client';
import { api } from '#/lib/api';
import { BilansPanel } from '#/components/bilans-panel';
import { Centered, CenteredLoading } from '#/components/shell';
import { PageShell } from '#/components/super-ui';

export const Route = createFileRoute('/app/bilans')({
  component: MyBilansPage,
});

function MyBilansPage() {
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

  if (isPending) return <CenteredLoading />;
  if (!session) return null;
  if (error) {
    return (
      <Centered>
        <div className="text-center">
          <p className="font-medium">{error}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vos bilans sont accessibles via votre compte alternant.
          </p>
          <Link to="/app" className="mt-4 inline-block text-sm text-brand hover:underline">
            ← Retour
          </Link>
        </div>
      </Centered>
    );
  }
  if (!profilId) return <CenteredLoading />;

  return (
    <PageShell title="Mes bilans" maxWidth="max-w-3xl">
        <BilansPanel alternantProfilId={profilId} />
    </PageShell>
  );
}
