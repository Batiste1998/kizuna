import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageShell } from '#/components/super-ui';
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
    <PageShell title="Bilans de l’alternant" maxWidth="max-w-3xl" back={{ to: "/app/alternants", label: "Mes alternants" }}>
        <BilansPanel alternantProfilId={alternantId} />
    </PageShell>
  );
}
