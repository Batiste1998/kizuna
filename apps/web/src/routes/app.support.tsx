import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useSession } from '#/lib/auth-client';
import { api, type TicketPriority, type TicketSummary, type TicketType } from '#/lib/api';
import { TICKET_PRIORITY_META, TICKET_STATUS_META, TICKET_TYPE_LABELS } from '#/lib/levels';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Centered } from '#/components/shell';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/app/support')({
  component: SupportPage,
});

function SupportPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState<{ canTriage: boolean; tickets: TicketSummary[] } | null>(null);
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<TicketType>('demande');
  const [priority, setPriority] = useState<TicketPriority>('moyenne');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  useEffect(() => {
    if (!session) return;
    api
      .getTickets()
      .then(setData)
      .catch(() => setData({ canTriage: false, tickets: [] }));
  }, [session]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSubmitting(true);
    try {
      const ticket = await api.createTicket({ subject, type, priority, description });
      setData({ ...data, tickets: [ticket, ...data.tickets] });
      setSubject('');
      setDescription('');
      toast.success(`Ticket ${ticket.ref} créé`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (isPending || (!data && session)) return <Centered>Chargement…</Centered>;
  if (!session || !data) return null;

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link to="/app" className="text-xs text-muted-foreground hover:text-brand">
            ← Espace
          </Link>
          <h1 className="text-lg font-bold tracking-tight">
            {data.canTriage ? 'File de support' : 'Support'}
          </h1>
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {!data.canTriage && (
          <form
            onSubmit={handleCreate}
            className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="space-y-1.5">
              <Label htmlFor="subject">Sujet</Label>
              <Input
                id="subject"
                required
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Décrivez votre demande en quelques mots"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as TicketType)}
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                >
                  <option value="demande">Demande</option>
                  <option value="bug">Bug</option>
                </select>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="priority">Priorité</Label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                >
                  <option value="basse">Basse</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="haute">Haute</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                required
                maxLength={5000}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Donnez le maximum de détails…"
                className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || !subject || !description}>
                {submitting ? 'Envoi…' : 'Ouvrir le ticket'}
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {data.tickets.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Aucun ticket.
            </p>
          )}
          {data.tickets.map((t) => {
            const status = TICKET_STATUS_META[t.status];
            const prio = TICKET_PRIORITY_META[t.priority];
            return (
              <Link
                key={t.id}
                to="/app/support/$ticketId"
                params={{ ticketId: t.id }}
                className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-brand"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{t.ref}</span>
                      <span className="font-semibold">{t.subject}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {TICKET_TYPE_LABELS[t.type]}
                      {data.canTriage && t.requesterName ? ` · ${t.requesterName}` : ''}
                      {t.assigneeName ? ` · assigné à ${t.assigneeName}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        status.className,
                      )}
                    >
                      {status.label}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        prio.className,
                      )}
                    >
                      {prio.label}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
