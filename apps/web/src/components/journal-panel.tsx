import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { api, type JournalStatus, type JournalView } from '#/lib/api';
import { JOURNAL_STATUS_META } from '#/lib/levels';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { cn } from '#/lib/utils';

/** Activity journal for one apprentice: compose (alternant) and validate (company tutor). */
export function JournalPanel({ alternantProfilId }: { alternantProfilId: string }) {
  const [view, setView] = useState<JournalView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getJournal(alternantProfilId)
      .then(setView)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [alternantProfilId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!view) return;
    setSubmitting(true);
    try {
      const entry = await api.createJournalEntry(alternantProfilId, { title, content });
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

  async function review(entryId: string, status: 'validated' | 'changes_requested') {
    if (!view) return;
    try {
      await api.reviewJournalEntry(entryId, { status });
      setView({
        ...view,
        entries: view.entries.map((e) => (e.id === entryId ? { ...e, status } : e)),
      });
      toast.success(status === 'validated' ? 'Entrée validée' : 'Modifications demandées');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!view) return null;

  const canWrite = view.editableAs === 'auto';
  const canReview = view.editableAs === 'entreprise';

  return (
    <div className="space-y-6">
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
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
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
        {view.entries.map((entry) => (
          <JournalEntryCard
            key={entry.id}
            title={entry.title}
            content={entry.content}
            authorName={entry.authorName}
            createdAt={entry.createdAt}
            status={entry.status}
            reviewComment={entry.reviewComment}
            canReview={canReview}
            onReview={(status) => review(entry.id, status)}
          />
        ))}
      </div>
    </div>
  );
}

function JournalEntryCard({
  title,
  content,
  authorName,
  createdAt,
  status,
  reviewComment,
  canReview,
  onReview,
}: {
  title: string;
  content: string;
  authorName: string | null;
  createdAt: string;
  status: JournalStatus;
  reviewComment: string | null;
  canReview: boolean;
  onReview: (status: 'validated' | 'changes_requested') => void;
}) {
  const meta = JOURNAL_STATUS_META[status];
  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {authorName} · {new Date(createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <span
          className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', meta.className)}
        >
          {meta.label}
        </span>
      </div>
      <p className="mt-3 text-sm whitespace-pre-wrap text-secondary-foreground">{content}</p>
      {reviewComment && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
          <span className="font-medium text-secondary-foreground">Retour du tuteur :</span>{' '}
          {reviewComment}
        </div>
      )}
      {canReview && status === 'pending' && (
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => onReview('validated')}>
            Valider
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReview('changes_requested')}>
            Demander des précisions
          </Button>
        </div>
      )}
    </article>
  );
}
