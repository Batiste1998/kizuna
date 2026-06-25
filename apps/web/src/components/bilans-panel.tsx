import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { api, type BilansView, type BilanStatus } from '#/lib/api';
import { BILAN_STATUS_META } from '#/lib/levels';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { cn } from '#/lib/utils';

const STATUSES: BilanStatus[] = ['planned', 'done', 'signed'];

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

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!view) return null;

  return (
    <div className="space-y-6">
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

      <div className="space-y-3">
        {view.bilans.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Aucun bilan planifié.
          </p>
        )}
        {view.bilans.map((bilan) => {
          const meta = BILAN_STATUS_META[bilan.status];
          return (
            <article
              key={bilan.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
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
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                    meta.className,
                  )}
                >
                  {meta.label}
                </span>
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
