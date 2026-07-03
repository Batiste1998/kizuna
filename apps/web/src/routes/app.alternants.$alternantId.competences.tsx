import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageShell } from '#/components/super-ui';
import { useSession } from '#/lib/auth-client';
import { CompetencesPanel } from '#/components/competences-panel';
import { CenteredLoading } from '#/components/shell';

export const Route = createFileRoute('/app/alternants/$alternantId/competences')({
  component: AlternantCompetencesPage,
});

function AlternantCompetencesPage() {
  const { alternantId } = Route.useParams();
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  if (isPending) return <CenteredLoading />;
  if (!session) return null;

  return (
    <PageShell title="Compétences de l’alternant" maxWidth="max-w-4xl" back={{ to: "/app/alternants", label: "Mes alternants" }}>
        <CompetencesPanel alternantProfilId={alternantId} />
    </PageShell>
  );
}
