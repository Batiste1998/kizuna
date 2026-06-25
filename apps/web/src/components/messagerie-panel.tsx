import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useSession } from '#/lib/auth-client';
import { api, type MessagerieView } from '#/lib/api';
import { AUTHOR_RELATION_META } from '#/lib/levels';
import { Button } from '#/components/ui/button';
import { cn } from '#/lib/utils';

/** Trinôme thread for one apprentice. */
export function MessageriePanel({ alternantProfilId }: { alternantProfilId: string }) {
  const { data: session } = useSession();
  const myId = session?.user.id;
  const [view, setView] = useState<MessagerieView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getMessages(alternantProfilId)
      .then(setView)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [alternantProfilId]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!view || !draft.trim()) return;
    setSending(true);
    try {
      const message = await api.sendMessage(alternantProfilId, draft.trim());
      setView({ ...view, messages: [...view.messages, message] });
      setDraft('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!view) return null;

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {view.messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Aucun message. Démarrez la conversation du trinôme.
          </p>
        )}
        {view.messages.map((m) => {
          const mine = m.authorUserId === myId;
          const meta = AUTHOR_RELATION_META[m.authorRelation];
          return (
            <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
              <div className="mb-0.5 flex items-center gap-1.5">
                <span className="text-xs font-medium">{m.authorName}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    meta.className,
                  )}
                >
                  {meta.label}
                </span>
              </div>
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap',
                  mine
                    ? 'rounded-br-sm bg-brand text-white'
                    : 'rounded-bl-sm bg-muted text-secondary-foreground',
                )}
              >
                {m.body}
              </div>
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                {new Date(m.createdAt).toLocaleString('fr-FR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          );
        })}
      </div>

      {view.canPost ? (
        <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-border p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={1}
            maxLength={5000}
            placeholder="Votre message…"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
          <Button type="submit" disabled={sending || !draft.trim()}>
            Envoyer
          </Button>
        </form>
      ) : (
        <p className="border-t border-border p-3 text-center text-xs text-muted-foreground">
          Lecture seule (réservé au trinôme).
        </p>
      )}
    </div>
  );
}
