import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageShell } from '#/components/super-ui';
import { useSession } from '#/lib/auth-client';
import { MessageriePanel } from '#/components/messagerie-panel';
import { CenteredLoading } from '#/components/shell';

export const Route = createFileRoute('/app/alternants/$alternantId/messagerie')({
  component: AlternantMessageriePage,
});

function AlternantMessageriePage() {
  const { alternantId } = Route.useParams();
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  if (isPending) return <CenteredLoading />;
  if (!session) return null;

  return (
    <PageShell title="Messagerie" maxWidth="max-w-3xl" back={{ to: "/app/alternants", label: "Mes alternants" }}>
        <MessageriePanel alternantProfilId={alternantId} />
    </PageShell>
  );
}
