import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { CheckCircle2, Clock, Inbox, LifeBuoy, Plus, Search } from 'lucide-react';
import {
  api,
  type TicketPriority,
  type TicketStatus,
  type TicketSummary,
  type TicketType,
} from '#/lib/api';
import { TICKET_PRIORITY_META, TICKET_STATUS_META, TICKET_TYPE_LABELS } from '#/lib/levels';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Avatar, PageShell, Panel, StatCard } from '#/components/super-ui';
import { Slideover } from './app.admin.alternants';
import { selectClass } from '#/components/admin-forms';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/app/support/')({
  component: SupportPage,
});

const STATUS_FILTERS: Array<{ key: 'all' | TicketStatus; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'open', label: 'Ouverts' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'resolved', label: 'Résolus' },
];

function Badge({ meta }: { meta: { label: string; className: string } }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

function SupportPage() {
  const [data, setData] = useState<{ canTriage: boolean; tickets: TicketSummary[] } | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | TicketStatus>('all');
  const [creating, setCreating] = useState(false);

  function reload() {
    api
      .getTickets()
      .then(setData)
      .catch(() => setData({ canTriage: false, tickets: [] }));
  }
  useEffect(() => reload(), []);

  const tickets = data?.tickets ?? [];
  const counts = useMemo(
    () => ({
      open: tickets.filter((t) => t.status === 'open').length,
      in_progress: tickets.filter((t) => t.status === 'in_progress').length,
      resolved: tickets.filter((t) => t.status === 'resolved').length,
    }),
    [tickets],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        t.ref.toLowerCase().includes(q) ||
        (t.requesterName ?? '').toLowerCase().includes(q)
      );
    });
  }, [tickets, search, filter]);

  if (!data) {
    return (
      <PageShell title="Support" maxWidth="max-w-5xl">
        <Panel className="px-5 py-14 text-center text-sm text-muted-foreground">Chargement…</Panel>
      </PageShell>
    );
  }

  const canTriage = data.canTriage;

  return (
    <PageShell
      title="Support"
      maxWidth="max-w-5xl"
      actions={
        !canTriage ? (
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nouvelle demande
          </Button>
        ) : undefined
      }
    >
      {canTriage
        ? 'Suivez les demandes et les bugs remontés par les utilisateurs de la plateforme.'
        : 'Une question, un bug ? Ouvrez un ticket, l’équipe support vous répond ici.'}

      {canTriage && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Ouverts" value={counts.open} sub="à traiter" icon={<Inbox />} />
          <StatCard label="En cours" value={counts.in_progress} sub="en traitement" icon={<Clock />} />
          <StatCard label="Résolus" value={counts.resolved} sub="clôturés" icon={<CheckCircle2 />} />
          <StatCard label="Total" value={tickets.length} sub="tickets" icon={<LifeBuoy />} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un ticket…"
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {STATUS_FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'border-transparent bg-brand-soft text-brand-strong'
                    : 'border-hairline bg-card text-secondary-foreground hover:border-brand',
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <th className="px-5 py-3">Sujet</th>
                {canTriage && <th className="px-4 py-3">Demandeur</th>}
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Priorité</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-hairline last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <Link to="/app/support/$ticketId" params={{ ticketId: t.id }} className="block">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">{t.ref}</span>
                        <span className="font-semibold">{t.subject}</span>
                      </div>
                    </Link>
                  </td>
                  {canTriage && (
                    <td className="px-4 py-3">
                      {t.requesterName ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={t.requesterName} size={28} />
                          <span className="text-sm whitespace-nowrap">{t.requesterName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Badge
                      meta={{
                        label: TICKET_TYPE_LABELS[t.type],
                        className:
                          t.type === 'bug'
                            ? 'bg-[#FBEBE3] text-[#B54F2C]'
                            : 'bg-[#E8EEF7] text-[#3D5E8E]',
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge meta={TICKET_PRIORITY_META[t.priority]} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge meta={TICKET_STATUS_META[t.status]} />
                  </td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div className="font-semibold">Aucun ticket</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {canTriage ? 'Rien à traiter pour ce filtre.' : 'Vous n’avez ouvert aucun ticket.'}
            </div>
          </div>
        )}
      </Panel>

      {creating && (
        <Slideover
          title="Nouvelle demande"
          subtitle="Décrivez votre demande, l’équipe support la prend en charge."
          onClose={() => setCreating(false)}
        >
          <CreateTicketForm
            onClose={() => setCreating(false)}
            onCreated={() => {
              setCreating(false);
              reload();
            }}
          />
        </Slideover>
      )}
    </PageShell>
  );
}

function CreateTicketForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<TicketType>('demande');
  const [priority, setPriority] = useState<TicketPriority>('moyenne');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const ticket = await api.createTicket({ subject, type, priority, description });
      toast.success(`Ticket ${ticket.ref} créé`);
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value as TicketType)} className={selectClass}>
            <option value="demande">Demande</option>
            <option value="bug">Bug</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priority">Priorité</Label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            className={selectClass}
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
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Donnez le maximum de détails…"
          className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm shadow-xs transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none"
        />
      </div>
      <div className="flex justify-end gap-2.5">
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" disabled={busy || !subject || !description}>
          {busy ? 'Envoi…' : 'Ouvrir le ticket'}
        </Button>
      </div>
    </form>
  );
}
