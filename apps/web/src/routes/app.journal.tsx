import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useSession } from '#/lib/auth-client';
import { api, type JournalView } from '#/lib/api';
import { JOURNAL_STATUS_META } from '#/lib/levels';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/app/journal')({
  component: JournalPage,
});

function JournalPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [view, setView] = useState<JournalView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError(null);
    api
      .myAlternantProfile()
      .then((p) => api.getJournal(p.alternantProfilId))
      .then(setView)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!view) return;
    setSubmitting(true);
    try {
      const entry = await api.createJournalEntry(view.alternantProfilId, { title, content });
      setView({ ...view, entries: [entry, ...view.entries] });
      setTitle('');
      setContent('');
      toast.success('Entrée publiée');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (isPending || (loading && session)) return <Centered>Chargement…</Centered>;
  if (!session) return null;
  if (error) {
    return (
      <Centered>
        <div className="text-center">
          <p className="font-medium">{error}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Le journal cible un alternant. Connectez-vous avec un compte alternant.
          </p>
          <Link to="/app" className="mt-4 inline-block text-sm text-brand hover:underline">
            ← Retour
          </Link>
        </div>
      </Centered>
    );
  }
  if (!view) return null;

  const canWrite = view.editableAs === 'auto';

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link to="/app" className="text-xs text-muted-foreground hover:text-brand">
            ← Espace
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Mon journal d’activités</h1>
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {canWrite && (
          <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="space-y-1.5">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Mise en place de la CI"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="content">Description de l’activité</Label>
              <textarea
                id="content"
                required
                maxLength={5000}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Décrivez les missions réalisées, les compétences mobilisées…"
                className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || !title || !content}>
                {submitting ? 'Publication…' : 'Publier l’entrée'}
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {view.entries.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Aucune entrée pour le moment.
            </p>
          )}
          {view.entries.map((entry) => {
            const meta = JOURNAL_STATUS_META[entry.status];
            return (
              <article
                key={entry.id}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{entry.title}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {entry.authorName} · {new Date(entry.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                      meta.className,
                    )}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-secondary-foreground">
                  {entry.content}
                </p>
                {entry.reviewComment && (
                  <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                    <span className="font-medium text-secondary-foreground">
                      Retour du tuteur :
                    </span>{' '}
                    {entry.reviewComment}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center text-muted-foreground">{children}</main>
  );
}
