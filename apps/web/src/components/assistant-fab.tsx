import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LifeBuoy, MessageCircleQuestion, Send, X } from 'lucide-react';
import { api, type Me } from '#/lib/api';
import { cn } from '#/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** SessionStorage key read by the support page to prefill a new ticket. */
export const TICKET_DRAFT_KEY = 'kizuna-ticket-draft';

const WELCOME =
  'Bonjour ! Je suis l’assistant Kizuna. Posez-moi vos questions sur la plateforme — ' +
  'évaluations, journal, bilans, documents… Si je ne peux pas vous aider, je vous ' +
  'orienterai vers le support.';

/**
 * Floating help assistant, stacked above the accessibility FAB. Streams answers
 * grounded in the user manual; hands off to a prefilled support ticket when the
 * conversation needs a human. Hidden entirely when the server has no AI key.
 */
export function AssistantFab({ me }: { me: Me }) {
  const [configured, setConfigured] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Support agents answer the tickets; the assistant is for everyone else.
  const relevant = me.role !== 'support' && me.role !== 'super_admin';

  useEffect(() => {
    if (!relevant) return;
    api
      .aiStatus()
      .then((s) => setConfigured(s.configured))
      .catch(() => setConfigured(false));
  }, [relevant]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        fabRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Keep the latest exchange in view while the reply streams in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  if (!relevant || !configured) return null;

  async function send(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setInput('');
    setBusy(true);
    const history: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    try {
      await api.streamAssistant(history.slice(-10), (chunk) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      });
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: `⚠️ ${(err as Error).message}`,
        };
        return next;
      });
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function openTicket() {
    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'Moi' : 'Assistant'} : ${m.content}`)
      .join('\n\n');
    try {
      sessionStorage.setItem(
        TICKET_DRAFT_KEY,
        JSON.stringify({
          subject: messages.find((m) => m.role === 'user')?.content.slice(0, 120) ?? '',
          description: transcript ? `Conversation avec l’assistant :\n\n${transcript}` : '',
        }),
      );
    } catch {
      /* ignore */
    }
    setOpen(false);
    void navigate({ to: '/app/support' });
  }

  return (
    <div className="fixed right-5 bottom-[4.9rem] z-40">
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Assistant d’aide Kizuna"
            className="absolute right-0 bottom-16 flex h-[480px] max-h-[calc(100vh-8rem)] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-hairline bg-popover text-popover-foreground shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageCircleQuestion className="h-5 w-5 text-brand-strong" />
                <span className="text-[15px] font-bold tracking-tight">Assistant Kizuna</span>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  fabRef.current?.focus();
                }}
                aria-label="Fermer l’assistant"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              ref={scrollRef}
              aria-live="polite"
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              <Bubble role="assistant">{WELCOME}</Bubble>
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role}>
                  {m.content || '…'}
                </Bubble>
              ))}
            </div>

            <div className="border-t border-hairline px-4 pt-3 pb-4">
              <form onSubmit={send} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={4000}
                  placeholder="Votre question…"
                  aria-label="Votre question pour l’assistant"
                  className="h-9 flex-1 rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  aria-label="Envoyer"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand text-white transition-opacity disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <button
                type="button"
                onClick={openTicket}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                Besoin d’un humain ? Créer un ticket support
              </button>
            </div>
          </div>
        </>
      )}

      <button
        ref={fabRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Ouvrir l’assistant d’aide"
        className={cn(
          'flex items-center justify-center rounded-full bg-brand text-white shadow-lg ring-2 ring-brand/40 transition-transform hover:scale-105',
        )}
        style={{ height: 52, width: 52 }}
      >
        <MessageCircleQuestion className="h-6 w-6" />
      </button>
    </div>
  );
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: string }) {
  return (
    <div
      className={cn(
        'max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap',
        role === 'user'
          ? 'ml-auto rounded-br-sm bg-brand text-white'
          : 'mr-auto rounded-bl-sm bg-muted text-foreground',
      )}
    >
      {children}
    </div>
  );
}
