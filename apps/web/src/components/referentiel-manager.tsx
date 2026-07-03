import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import {
  api,
  type AdminPromotion,
  type ReferentielDraft,
  type ReferentielView,
} from '#/lib/api';
import { Button } from '#/components/ui/button';
import { ThreadSkeleton } from '#/components/ui/skeleton';

/**
 * Referentiel panel of one promotion (inside the admin slideover): shows the
 * imported blocs/compétences, or walks the admin through the AI import — paste
 * the RNCP text, review the extracted structure, save.
 */
export function ReferentielManager({ promotion }: { promotion: AdminPromotion }) {
  const [view, setView] = useState<ReferentielView | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getPromotionReferentiel(promotion.id), api.aiStatus()])
      .then(([v, s]) => {
        setView(v);
        setAiConfigured(s.configured);
      })
      .catch((e: Error) => setError(e.message));
  }, [promotion.id]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!view) return <ThreadSkeleton rows={4} />;

  if (view.referentiel) return <ReferentielTree referentiel={view.referentiel} />;
  return (
    <ImportFlow
      promotionId={promotion.id}
      aiConfigured={aiConfigured === true}
      onSaved={setView}
    />
  );
}

function ReferentielTree({
  referentiel,
}: {
  referentiel: NonNullable<ReferentielView['referentiel']>;
}) {
  const competenceCount = referentiel.blocs.reduce((s, b) => s + b.competences.length, 0);
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-hairline bg-muted/40 p-4">
        <span className="rounded-lg bg-brand-soft px-2.5 py-1 font-mono text-xs font-semibold text-brand-strong">
          {referentiel.code}
        </span>
        <h3 className="mt-2.5 text-[15px] font-bold tracking-tight">{referentiel.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {referentiel.level ? `Niveau ${referentiel.level} · ` : ''}
          {referentiel.blocs.length} bloc{referentiel.blocs.length > 1 ? 's' : ''} ·{' '}
          {competenceCount} compétence{competenceCount > 1 ? 's' : ''}
        </p>
      </div>

      {referentiel.blocs.map((bloc) => (
        <section key={bloc.id}>
          <h4 className="flex items-baseline gap-2 text-sm font-bold tracking-tight">
            <span className="font-mono text-xs font-semibold text-brand-strong">{bloc.code}</span>
            {bloc.label}
          </h4>
          <ul className="mt-2 space-y-1.5 border-l border-hairline pl-4">
            {bloc.competences.map((c) => (
              <li key={c.id} className="text-[13px] leading-snug text-secondary-foreground">
                {c.code && (
                  <span className="mr-1.5 font-mono text-[11px] font-semibold text-muted-foreground">
                    {c.code}
                  </span>
                )}
                {c.label}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ImportFlow({
  promotionId,
  aiConfigured,
  onSaved,
}: {
  promotionId: string;
  aiConfigured: boolean;
  onSaved: (view: ReferentielView) => void;
}) {
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<ReferentielDraft | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function analyze() {
    setAnalyzing(true);
    try {
      setDraft(await api.extractReferentiel(text));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const view = await api.savePromotionReferentiel(promotionId, draft);
      toast.success('Référentiel enregistré et lié à la promotion');
      onSaved(view);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (draft) {
    const competenceCount = draft.blocs.reduce((s, b) => s + b.competences.length, 0);
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-hairline bg-muted/40 p-4">
          <span className="rounded-lg bg-brand-soft px-2.5 py-1 font-mono text-xs font-semibold text-brand-strong">
            {draft.code}
          </span>
          <h3 className="mt-2.5 text-[15px] font-bold tracking-tight">{draft.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Structure proposée par l’IA — {draft.blocs.length} bloc
            {draft.blocs.length > 1 ? 's' : ''}, {competenceCount} compétence
            {competenceCount > 1 ? 's' : ''}. Relisez avant d’enregistrer.
          </p>
        </div>

        {draft.blocs.map((bloc) => (
          <section key={bloc.code}>
            <h4 className="flex items-baseline gap-2 text-sm font-bold tracking-tight">
              <span className="font-mono text-xs font-semibold text-brand-strong">{bloc.code}</span>
              {bloc.label}
            </h4>
            <ul className="mt-2 space-y-1.5 border-l border-hairline pl-4">
              {bloc.competences.map((c, i) => (
                <li key={i} className="text-[13px] leading-snug text-secondary-foreground">
                  {c.code && (
                    <span className="mr-1.5 font-mono text-[11px] font-semibold text-muted-foreground">
                      {c.code}
                    </span>
                  )}
                  {c.label}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="flex items-center gap-2 border-t border-hairline pt-4">
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer le référentiel'}
          </Button>
          <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
            Revenir au texte
          </Button>
        </div>
      </div>
    );
  }

  if (!aiConfigured) {
    return (
      <div className="rounded-xl border border-hairline bg-muted/40 p-5 text-sm leading-relaxed text-secondary-foreground">
        L’import assisté par IA n’est pas activé sur ce serveur : ajoutez la variable{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">OPENAI_API_KEY</code>{' '}
        dans la configuration, puis revenez ici.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-secondary-foreground">
        Collez le texte du référentiel RNCP (depuis la fiche France Compétences ou le PDF du
        titre) : l’IA en extrait les blocs et compétences, que vous relisez avant
        l’enregistrement.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        placeholder="RNCP39583 — Expert en ingénierie du logiciel…&#10;&#10;BC01 — Concevoir et modéliser…&#10;C1. Analyser les besoins…"
        className="w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button onClick={() => void analyze()} disabled={analyzing || text.trim().length < 50}>
        <Sparkles className="h-4 w-4" />
        {analyzing ? 'Analyse en cours…' : 'Analyser avec l’IA'}
      </Button>
      {analyzing && (
        <p className="text-xs text-muted-foreground">
          L’analyse peut prendre jusqu’à une minute sur un référentiel complet.
        </p>
      )}
    </div>
  );
}
