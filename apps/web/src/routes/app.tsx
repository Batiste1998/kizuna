import { useEffect, useState, type ReactNode } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { signOut, useSession } from '#/lib/auth-client';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';

export const Route = createFileRoute('/app')({
  component: AppPage,
});

interface ApiMe {
  id: string;
  email: string;
  name: string;
  role: string;
}

const apiURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function AppPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [apiMe, setApiMe] = useState<ApiMe | null>(null);

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  useEffect(() => {
    if (!session) return;
    // Authenticated API consumption against the NestJS backend (Bloc 4).
    fetch(`${apiURL}/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setApiMe)
      .catch(() => setApiMe(null));
  }, [session]);

  if (isPending) {
    return (
      <main className="grid min-h-screen place-items-center text-muted-foreground">
        Chargement…
      </main>
    );
  }
  if (!session) return null;

  const appRole = apiMe?.role ?? 'user';
  const dataRole = appRole === 'super_admin' || appRole === 'support' ? appRole : undefined;

  async function handleSignOut() {
    await signOut();
    toast.success('Déconnecté');
    void navigate({ to: '/login' });
  }

  return (
    <main data-role={dataRole} className="min-h-screen">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar text-sm font-bold text-white">
              K
            </div>
            <span className="font-semibold">Kizuna</span>
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {appRole}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Se déconnecter
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour {session.user.name?.split(' ')[0] ?? ''} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Votre espace est en cours de construction. La session et l’API sécurisée fonctionnent.
        </p>

        <nav className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/app/competences"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-brand"
          >
            Mes compétences →
          </Link>
          <Link
            to="/app/journal"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-brand"
          >
            Mon journal →
          </Link>
          <Link
            to="/app/bilans"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-brand"
          >
            Mes bilans →
          </Link>
          <Link
            to="/app/echeancier"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-brand"
          >
            Échéancier →
          </Link>
          <Link
            to="/app/messagerie"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-brand"
          >
            Messagerie →
          </Link>
          <Link
            to="/app/alternants"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-brand"
          >
            Mes alternants (tuteur) →
          </Link>
        </nav>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session (Better Auth)</CardTitle>
              <CardDescription>État côté client</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Row label="Nom" value={session.user.name} />
              <Row label="Email" value={session.user.email} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">API /me (NestJS)</CardTitle>
              <CardDescription>Appel authentifié au back-end</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {apiMe ? (
                <>
                  <Row label="Rôle" value={apiMe.role} />
                  <Row label="ID" value={<span className="font-mono text-xs">{apiMe.id}</span>} />
                </>
              ) : (
                <span className="text-muted-foreground">Chargement…</span>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
