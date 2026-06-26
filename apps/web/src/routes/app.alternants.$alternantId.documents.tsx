import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageShell } from '#/components/super-ui';
import { useSession } from '#/lib/auth-client';
import { DocumentsPanel } from '#/components/documents-panel';
import { Centered } from '#/components/shell';

export const Route = createFileRoute('/app/alternants/$alternantId/documents')({
  component: AlternantDocumentsPage,
});

function AlternantDocumentsPage() {
  const { alternantId } = Route.useParams();
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  if (isPending) return <Centered>Chargement…</Centered>;
  if (!session) return null;

  return (
    <PageShell title="Documents de l’alternant" maxWidth="max-w-3xl" back={{ to: "/app/alternants", label: "Mes alternants" }}>
        <DocumentsPanel alternantProfilId={alternantId} />
    </PageShell>
  );
}
