import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { PenLine, X } from 'lucide-react';
import { api, type JournalStatus, type JournalView } from '#/lib/api';
import { JOURNAL_STATUS_META } from '#/lib/levels';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { EmptyThread } from '#/components/ui/empty-thread';
import { ThreadSkeleton } from '#/components/ui/skeleton';
import {
  ThreadBead,
  ThreadTimeline,
  ThreadTimelineItem,
} from '#/components/ui/thread-timeline';
import { cn } from '#/lib/utils';

/** Bead colour on the journal thread, keyed by review status. */
const STATUS_BEAD: Record<JournalStatus, string> = {
  pending: 'bg-status-amber-fg/70',
  validated: 'bg-brand/60',
  changes_requested: 'bg-status-orange-fg/80',
};

/** Activity journal for one apprentice: compose (alternant) and validate (company tutor). */
export function JournalPanel({ alternantProfilId }: { alternantProfilId: string }) {
  const [view, setView] = useState<JournalView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
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
      setComposing(false);
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

  if (loading) return <ThreadSkeleton rows={3} />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!view) return null;

  const canWrite = view.editableAs === 'auto';
  const canReview = view.editableAs === 'entreprise';

  return (
    <div className="space-y-5">
      {canWrite &&
        (composing ? (
          <form
            onSubmit={handleSubmit}
            className="animate-rise space-y-3 rounded-2xl border border-brand/20 bg-card p-5 shadow-md ring-1 ring-brand/10"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[15px] font-semibold">Nouvelle entrée</h2>
              <button
                type="button"
                onClick={() => setComposing(false)}
                aria-label="Fermer le formulaire"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                required
                autoFocus
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setComposing(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting || !title || !content}>
                {submitting ? 'Publication…' : 'Publier l’entrée'}
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-5 py-4 text-left text-sm text-muted-foreground transition-colors hover:border-brand/50 hover:bg-brand-soft/30 hover:text-brand-strong"
          >
            <PenLine className="h-4 w-4" />
            Raconter une activité, une mission, un apprentissage…
          </button>
        ))}

      {view.entries.length === 0 ? (
        <EmptyThread title="Le journal est encore vierge">
          {canWrite
            ? 'Racontez vos missions au fil de l’eau : chaque entrée validée devient une preuve pour le référentiel.'
            : 'Les activités racontées par l’alternant apparaîtront ici, prêtes à être validées.'}
        </EmptyThread>
      ) : (
        <ThreadTimeline>
          {view.entries.map((entry) => (
            <ThreadTimelineItem
              key={entry.id}
              bead={<ThreadBead className={cn('ring-2 ring-card', STATUS_BEAD[entry.status])} />}
            >
              <JournalEntryCard
                title={entry.title}
                content={entry.content}
                authorName={entry.authorName}
                createdAt={entry.createdAt}
                status={entry.status}
                reviewComment={entry.reviewComment}
                canReview={canReview}
                onReview={(status) => review(entry.id, status)}
              />
            </ThreadTimelineItem>
          ))}
        </ThreadTimeline>
      )}
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
            {authorName} ·{' '}
            {new Date(createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
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
        <div className="mt-3 rounded-lg border-l-2 border-brand/40 bg-muted/50 p-3 text-sm">
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
