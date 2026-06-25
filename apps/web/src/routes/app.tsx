import { useEffect, useState } from 'react';
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useSession } from '#/lib/auth-client';
import { api, type Me } from '#/lib/api';
import { AppShell } from '#/components/app-shell';
import { MeProvider } from '#/lib/me-context';
import { Centered } from '#/components/shell';

/** Layout for the /app/* space — authenticated shell with role-aware navigation. */
export const Route = createFileRoute('/app')({
  component: AppLayout,
});

function AppLayout() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [meError, setMeError] = useState(false);

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  useEffect(() => {
    if (!session) return;
    api
      .me()
      .then(setMe)
      .catch(() => setMeError(true));
  }, [session]);

  if (isPending) return <Centered>Chargement…</Centered>;
  if (!session) return null;
  if (meError) return <Centered>Session expirée. Reconnectez-vous.</Centered>;
  if (!me) return <Centered>Chargement…</Centered>;

  return (
    <MeProvider value={me}>
      <AppShell me={me}>
        <Outlet />
      </AppShell>
    </MeProvider>
  );
}
