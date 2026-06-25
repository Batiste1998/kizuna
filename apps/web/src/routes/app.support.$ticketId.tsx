import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useSession } from '#/lib/auth-client';
import { api, type TicketDetail, type TicketStatus } from '#/lib/api';
import { TICKET_PRIORITY_META, TICKET_STATUS_META, TICKET_TYPE_LABELS } from '#/lib/levels';
import { Button } from '#/components/ui/button';
import { Centered } from '#/components/shell';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/app/support/$ticketId')({
  component: TicketPage,
});

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved'];

function TicketPage() {
  const { ticketId } = Route.useParams();
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  useEffect(() => {
    if (!session) return;
    api
      .getTicket(ticketId)
      .then(setDetail)
      .catch((e: Error) => setError(e.message));
  }, [session, ticketId]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!detail || !draft.trim()) return;
    setSending(true);
    try {
      const message = await api.replyTicket(ticketId, draft.trim());
      setDetail({ ...detail, messages: [...detail.messages, message] });
      setDraft('');
      // refresh status/assignee after a support reply
      const fresh = await api.getTicket(ticketId);
      setDetail(fresh);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function setStatus(status: TicketStatus) {
    if (!detail) return;
    try {
      const ticket = await api.updateTicket(ticketId, { status });
      setDetail({ ...detail, ticket });
      toast.success('Statut mis à jour');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function assignToMe() {
    if (!detail) return;
    try {
      const ticket = await api.updateTicket(ticketId, { assignToMe: true });
      setDetail({ ...detail, ticket });
      toast.success('Ticket assigné');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (isPending) return <Centered>Chargement…</Centered>;
  if (!session) return null;
  if (error) {
    return (
      <Centered>
        <div className="text-center">
          <p className="font-medium">{error}</p>
          <Link to="/app/support" className="mt-4 inline-block text-sm text-brand hover:underline">
            ← Retour
          </Link>
        </div>
      </Centered>
    );
  }
  if (!detail) return <Centered>Chargement…</Centered>;

  const { ticket } = detail;
  const status = TICKET_STATUS_META[ticket.status];
  const prio = TICKET_PRIORITY_META[ticket.priority];

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link to="/app/support" className="text-xs text-muted-foreground hover:text-brand">
            ← Support
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{ticket.ref}</span>
            <h1 className="text-lg font-bold tracking-tight">{ticket.subject}</h1>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={cn('rounded-full px-2 py-0.5 font-semibold', status.className)}>
              {status.label}
            </span>
            <span className={cn('rounded-full px-2 py-0.5 font-semibold', prio.className)}>
              {prio.label}
            </span>
            <span className="text-muted-foreground">
              {TICKET_TYPE_LABELS[ticket.type]}
              {ticket.requesterName ? ` · ${ticket.requesterName}` : ''}
              {ticket.assigneeName ? ` · assigné à ${ticket.assigneeName}` : ''}
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-5 px-6 py-8">
        {detail.canTriage && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Statut :</span>
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                  ticket.status === s
                    ? TICKET_STATUS_META[s].className
                    : 'bg-card text-muted-foreground hover:bg-accent',
                )}
              >
                {TICKET_STATUS_META[s].label}
              </button>
            ))}
            <span className="ml-auto">
              <Button size="sm" variant="outline" onClick={assignToMe}>
                M’assigner
              </Button>
            </span>
          </div>
        )}

        <div className="space-y-3">
          {detail.messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                'rounded-xl border p-4 shadow-sm',
                m.authorIsSupport ? 'border-brand/30 bg-brand-soft/40' : 'border-border bg-card',
              )}
            >
              <div className="mb-1 flex items-center gap-2 text-xs">
                <span className="font-medium">{m.authorName}</span>
                {m.authorIsSupport && (
                  <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-strong">
                    Support
                  </span>
                )}
                <span className="text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap text-secondary-foreground">{m.body}</p>
            </div>
          ))}
        </div>

        {ticket.status !== 'resolved' && (
          <form onSubmit={handleReply} className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              maxLength={5000}
              placeholder="Votre réponse…"
              className="flex-1 resize-none rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            />
            <Button type="submit" disabled={sending || !draft.trim()}>
              Répondre
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
