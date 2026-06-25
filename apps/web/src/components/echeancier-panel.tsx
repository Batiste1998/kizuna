import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { api, type EcheancierView } from '#/lib/api';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { cn } from '#/lib/utils';

/** Promotion deadlines; tutors/admin add them, the whole cohort sees them. */
export function EcheancierPanel({ alternantProfilId }: { alternantProfilId: string }) {
  const [view, setView] = useState<EcheancierView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getEcheances(alternantProfilId)
      .then(setView)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [alternantProfilId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!view || !dueDate) return;
    setSubmitting(true);
    try {
      const echeance = await api.createEcheance(alternantProfilId, {
        title,
        dueDate: new Date(dueDate).toISOString(),
      });
      setView({
        ...view,
        echeances: [...view.echeances, echeance].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      });
      setTitle('');
      setDueDate('');
      toast.success('Échéance ajoutée');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!view) return null;

  const now = Date.now();

  return (
    <div className="space-y-6">
      {view.canManage && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-xl border border-border bg-card p-5 shadow-sm sm:grid-cols-[1fr_auto_auto] sm:items-end"
        >
          <div className="space-y-1.5">
            <Label htmlFor="title">Intitulé</Label>
            <Input
              id="title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Rendu du dossier projet"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due">Échéance</Label>
            <Input
              id="due"
              type="datetime-local"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting || !title || !dueDate}>
            {submitting ? '…' : 'Ajouter'}
          </Button>
        </form>
      )}

      <ol className="relative space-y-3 border-l border-border pl-5">
        {view.echeances.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune échéance pour cette promotion.</p>
        )}
        {view.echeances.map((e) => {
          const due = new Date(e.dueDate).getTime();
          const past = due < now;
          const days = Math.round((due - now) / 86400000);
          return (
            <li key={e.id} className="relative">
              <span
                className={cn(
                  'absolute top-1.5 -left-[1.4rem] h-2.5 w-2.5 rounded-full ring-2 ring-card',
                  past ? 'bg-muted-foreground/40' : 'bg-brand',
                )}
              />
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className={cn('font-semibold', past && 'text-muted-foreground')}>
                      {e.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(e.dueDate).toLocaleString('fr-FR', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                      past ? 'bg-[#EDEDE9] text-[#76766F]' : 'bg-brand-soft text-brand-strong',
                    )}
                  >
                    {past ? 'Passé' : days === 0 ? 'Aujourd’hui' : `J-${days}`}
                  </span>
                </div>
                {e.description && (
                  <p className="mt-2 text-sm whitespace-pre-wrap text-secondary-foreground">
                    {e.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
