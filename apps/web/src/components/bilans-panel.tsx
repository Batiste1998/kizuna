import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';
import { api, type BilansView, type BilanStatus } from '#/lib/api';
import { BILAN_STATUS_META } from '#/lib/levels';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Eyebrow } from '#/components/super-ui';
import { EmptyThread } from '#/components/ui/empty-thread';
import { ThreadSkeleton } from '#/components/ui/skeleton';
import { cn } from '#/lib/utils';

const STATUSES: BilanStatus[] = ['planned', 'done', 'signed'];

/**
 * The apprenticeship's reviews strung on one horizontal thread: signed beads are
 * filled, the realised one is amber, planned ones still hollow. Clicking a bead
 * scrolls to its card below.
 */
function BilanStepper({ bilans }: { bilans: BilansView['bilans'] }) {
  // Below 2 there is no thread to draw; above 12 the beads would collide.
  if (bilans.length < 2 || bilans.length > 12) return null;
  const lastDone = bilans.reduce(
    (acc, b, i) => (b.status !== 'planned' ? i : acc),
    -1,
  );
  const progressPct = lastDone <= 0 ? 0 : (lastDone / (bilans.length - 1)) * 100;

  return (
    <div className="animate-rise rounded-2xl border border-hairline bg-card px-7 pt-5 pb-4 shadow-sm">
      <Eyebrow className="mb-5 text-muted-foreground">Le fil des bilans</Eyebrow>
      <div className="relative mx-1.5">
        <span aria-hidden className="absolute top-[7px] right-0 left-0 h-0.5 rounded bg-border" />
        <span
          aria-hidden
          className="bg-brand-gradient absolute top-[7px] left-0 h-0.5 rounded transition-[width] duration-700 ease-[var(--ease-out)]"
          style={{ width: `${progressPct}%` }}
        />
        <ol className="relative flex justify-between">
          {bilans.map((b) => (
            <li key={b.id} className="flex max-w-24 flex-col items-center gap-2">
              <button
                type="button"
                title={`${b.label} · ${BILAN_STATUS_META[b.status].label}`}
                onClick={() =>
                  document
                    .getElementById(`bilan-${b.id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
                className={cn(
                  'h-[15px] w-[15px] rounded-full ring-2 ring-card transition-transform hover:scale-125',
                  b.status === 'signed' && 'bg-brand',
                  b.status === 'done' && 'bg-status-amber-fg/80',
                  b.status === 'planned' && 'border-2 border-border bg-card',
                )}
              />
              <span className="truncate text-[10.5px] font-medium text-muted-foreground tabular-nums">
                {new Date(b.scheduledAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Tripartite reviews for one apprentice; tutors/admin schedule and update status. */
export function BilansPanel({ alternantProfilId }: { alternantProfilId: string }) {
  const [view, setView] = useState<BilansView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getBilans(alternantProfilId)
      .then(setView)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [alternantProfilId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!view || !scheduledAt) return;
    setSubmitting(true);
    try {
      const bilan = await api.createBilan(alternantProfilId, {
        label,
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      setView({ ...view, bilans: [...view.bilans, bilan].sort(byDate) });
      setLabel('');
      setScheduledAt('');
      toast.success('Bilan planifié');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function exportPdf(bilanId: string, label: string) {
    try {
      const slug = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '');
      await api.downloadBilanPdf(bilanId, `bilan-${slug || 'export'}.pdf`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function setStatus(bilanId: string, status: BilanStatus) {
    if (!view) return;
    const previous = view;
    setView({
      ...view,
      bilans: view.bilans.map((b) => (b.id === bilanId ? { ...b, status } : b)),
    });
    try {
      await api.updateBilan(bilanId, { status });
      toast.success('Statut mis à jour');
    } catch (err) {
      setView(previous);
      toast.error((err as Error).message);
    }
  }

  if (loading) return <ThreadSkeleton rows={3} />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!view) return null;

  return (
    <div className="space-y-6">
      <BilanStepper bilans={view.bilans} />
      {view.canManage && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-xl border border-border bg-card p-5 shadow-sm sm:grid-cols-[1fr_auto_auto] sm:items-end"
        >
          <div className="space-y-1.5">
            <Label htmlFor="label">Intitulé du bilan</Label>
            <Input
              id="label"
              required
              maxLength={200}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex. Bilan de mi-parcours S3"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting || !label || !scheduledAt}>
            {submitting ? '…' : 'Planifier'}
          </Button>
        </form>
      )}

      <div className="stagger-children space-y-3">
        {view.bilans.length === 0 && (
          <EmptyThread title="Aucun bilan planifié">
            Les bilans tripartites — alternant, école, entreprise — viendront s’enfiler ici au fil
            de l’année.
          </EmptyThread>
        )}
        {view.bilans.map((bilan) => {
          const meta = BILAN_STATUS_META[bilan.status];
          return (
            <article
              key={bilan.id}
              id={`bilan-${bilan.id}`}
              className="scroll-mt-24 rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{bilan.label}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(bilan.scheduledAt).toLocaleString('fr-FR', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void exportPdf(bilan.id, bilan.label)}
                    title="Exporter en PDF"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <FileDown className="h-4 w-4" />
                  </button>
                  <span
                    className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', meta.className)}
                  >
                    {meta.label}
                  </span>
                </div>
              </div>

              {view.canManage && (
                <div className="mt-4 inline-flex overflow-hidden rounded-md border border-border">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(bilan.id, s)}
                      className={cn(
                        'px-3 py-1 text-xs font-semibold transition-colors',
                        bilan.status === s
                          ? BILAN_STATUS_META[s].className
                          : 'bg-card text-muted-foreground hover:bg-accent',
                      )}
                    >
                      {BILAN_STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function byDate(a: { scheduledAt: string }, b: { scheduledAt: string }) {
  return a.scheduledAt.localeCompare(b.scheduledAt);
}
