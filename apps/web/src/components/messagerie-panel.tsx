import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { SendHorizonal } from 'lucide-react';
import { useSession } from '#/lib/auth-client';
import { api, type MessagerieView } from '#/lib/api';
import { AUTHOR_RELATION_META } from '#/lib/levels';
import { Avatar } from '#/components/super-ui';
import { Button } from '#/components/ui/button';
import { EmptyThread } from '#/components/ui/empty-thread';
import { ThreadSkeleton } from '#/components/ui/skeleton';
import { cn } from '#/lib/utils';

// Shared formatters — each toLocale* call builds a fresh Intl.DateTimeFormat,
// which adds up when the whole thread re-renders on every keystroke.
const TIME_FMT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const DAY_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Aujourd’hui';
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return DAY_FMT.format(d);
}

/** Trinôme thread for one apprentice, grouped by day. */
export function MessageriePanel({ alternantProfilId }: { alternantProfilId: string }) {
  const { data: session } = useSession();
  const myId = session?.user.id;
  const [view, setView] = useState<MessagerieView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getMessages(alternantProfilId)
      .then(setView)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [alternantProfilId]);

  // Keep the conversation pinned to its latest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [view?.messages.length]);

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    if (!view || !draft.trim() || sending) return;
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

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  if (loading) return <ThreadSkeleton rows={3} />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!view) return null;

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-2xl border border-hairline bg-card shadow-sm">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-5">
        {view.messages.length === 0 && (
          <EmptyThread title="Aucun message">
            La conversation du trinôme commence ici — un même fil pour l’alternant et ses deux
            tuteurs.
          </EmptyThread>
        )}
        {view.messages.map((m, i) => {
          const prev = view.messages[i - 1];
          const mine = m.authorUserId === myId;
          const meta = AUTHOR_RELATION_META[m.authorRelation];
          const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
          // Runs of messages from the same author (same day) share one header.
          const newAuthor = newDay || !prev || prev.authorUserId !== m.authorUserId;
          const time = TIME_FMT.format(new Date(m.createdAt));
          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-4 flex items-center gap-3 first:mt-0" aria-hidden>
                  <span className="h-px flex-1 bg-hairline" />
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {dayLabel(m.createdAt)}
                  </span>
                  <span className="h-px flex-1 bg-hairline" />
                </div>
              )}
              <div
                className={cn(
                  'animate-rise flex gap-2.5',
                  mine ? 'justify-end' : 'justify-start',
                  newAuthor ? 'mt-3' : 'mt-1',
                )}
              >
                {!mine && (
                  <span className={cn('w-8 flex-none', !newAuthor && 'invisible')}>
                    <Avatar name={m.authorName} role={meta.role} size={32} />
                  </span>
                )}
                <div className={cn('max-w-[75%]', mine && 'flex flex-col items-end')}>
                  {newAuthor && !mine && (
                    <div className="mb-1 flex items-baseline gap-2 px-1">
                      <span className="text-xs font-semibold">{m.authorName}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {meta.label}
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      'group relative rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap',
                      mine
                        ? 'bg-brand-gradient rounded-br-sm text-white'
                        : 'rounded-bl-sm bg-muted text-secondary-foreground',
                    )}
                    title={time}
                  >
                    {m.body}
                    <span
                      className={cn(
                        'ml-2 align-baseline text-[10px] tabular-nums select-none',
                        mine ? 'text-white/60' : 'text-muted-foreground/70',
                      )}
                    >
                      {time}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {view.canPost ? (
        <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-hairline p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={5000}
            placeholder="Votre message… (Entrée pour envoyer)"
            aria-label="Votre message"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !draft.trim()}
            aria-label="Envoyer"
            className="h-11 w-11 flex-none rounded-xl"
          >
            <SendHorizonal className="h-[18px] w-[18px]" />
          </Button>
        </form>
      ) : (
        <p className="border-t border-hairline p-3 text-center text-xs text-muted-foreground">
          Lecture seule (réservé au trinôme).
        </p>
      )}
    </div>
  );
}
