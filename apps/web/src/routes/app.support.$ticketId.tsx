import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { api, type TicketDetail, type TicketStatus } from '#/lib/api';
import { TICKET_PRIORITY_META, TICKET_STATUS_META, TICKET_TYPE_LABELS } from '#/lib/levels';
import { Button } from '#/components/ui/button';
import { Avatar, ForbiddenSuper, PageShell, Panel } from '#/components/super-ui';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/app/support/$ticketId')({
  component: TicketPage,
});

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved'];

function Badge({ meta }: { meta: { label: string; className: string } }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

function TicketPage() {
  const { ticketId } = Route.useParams();
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api
      .getTicket(ticketId)
      .then(setDetail)
      .catch(() => setError(true));
  }, [ticketId]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!detail || !draft.trim()) return;
    setSending(true);
    try {
      await api.replyTicket(ticketId, draft.trim());
      setDraft('');
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

  if (error) return <ForbiddenSuper />;
  if (!detail) {
    return (
      <PageShell title="Ticket" maxWidth="max-w-3xl" back={{ to: '/app/support', label: 'Support' }}>
        <Panel className="px-5 py-14 text-center text-sm text-muted-foreground">Chargement…</Panel>
      </PageShell>
    );
  }

  const { ticket } = detail;

  return (
    <PageShell
      title={ticket.subject}
      maxWidth="max-w-3xl"
      back={{ to: '/app/support', label: 'Support' }}
    >
      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{ticket.ref}</span>
        <Badge meta={TICKET_STATUS_META[ticket.status]} />
        <Badge meta={TICKET_PRIORITY_META[ticket.priority]} />
        <span className="text-sm text-muted-foreground">
          {TICKET_TYPE_LABELS[ticket.type]}
          {ticket.requesterName ? ` · ${ticket.requesterName}` : ''}
          {ticket.assigneeName ? ` · assigné à ${ticket.assigneeName}` : ''}
        </span>
      </div>

      {detail.canTriage && (
        <Panel className="flex flex-wrap items-center gap-2 p-3">
          <span className="px-1 text-xs font-medium text-muted-foreground">Statut :</span>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                ticket.status === s
                  ? 'bg-brand text-white'
                  : 'text-muted-foreground hover:bg-muted',
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
        </Panel>
      )}

      <div className="flex flex-col gap-3">
        {detail.messages.map((m) => (
          <div key={m.id} className={cn('flex gap-3', m.authorIsSupport && 'flex-row-reverse')}>
            <Avatar name={m.authorName} role={m.authorIsSupport ? 'support' : undefined} size={36} />
            <div
              className={cn(
                'max-w-[80%] rounded-2xl border px-4 py-3',
                m.authorIsSupport
                  ? 'border-brand-soft bg-brand-soft/60'
                  : 'border-hairline bg-card shadow-sm',
              )}
            >
              <div className="mb-1 flex items-center gap-2 text-xs">
                <span className="font-semibold">{m.authorName}</span>
                {m.authorIsSupport && (
                  <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand-strong">
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
          </div>
        ))}
      </div>

      {ticket.status !== 'resolved' ? (
        <Panel className="p-3">
          <form onSubmit={handleReply} className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              maxLength={5000}
              placeholder="Votre réponse…"
              className="flex-1 resize-none rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm shadow-xs transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none"
            />
            <Button type="submit" disabled={sending || !draft.trim()}>
              Répondre
            </Button>
          </form>
        </Panel>
      ) : (
        <p className="rounded-2xl border border-hairline bg-muted/40 px-5 py-4 text-center text-sm text-muted-foreground">
          Ce ticket est résolu.
        </p>
      )}
    </PageShell>
  );
}
