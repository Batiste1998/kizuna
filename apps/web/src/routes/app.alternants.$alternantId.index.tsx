import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  ClipboardCheck,
  CalendarClock,
  FolderClosed,
  GraduationCap,
  MessagesSquare,
  NotebookPen,
} from 'lucide-react';
import { useSession } from '#/lib/auth-client';
import { api, type TutorAlternant } from '#/lib/api';
import { Centered } from '#/components/shell';

export const Route = createFileRoute('/app/alternants/$alternantId/')({
  component: AlternantOverviewPage,
});

const TABS = [
  { to: '/app/alternants/$alternantId/competences', label: 'Compétences', icon: GraduationCap },
  { to: '/app/alternants/$alternantId/journal', label: 'Journal', icon: NotebookPen },
  { to: '/app/alternants/$alternantId/bilans', label: 'Bilans', icon: ClipboardCheck },
  { to: '/app/alternants/$alternantId/echeancier', label: 'Échéancier', icon: CalendarClock },
  { to: '/app/alternants/$alternantId/messagerie', label: 'Messagerie', icon: MessagesSquare },
  { to: '/app/alternants/$alternantId/documents', label: 'Documents', icon: FolderClosed },
] as const;

function AlternantOverviewPage() {
  const { alternantId } = Route.useParams();
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [alternant, setAlternant] = useState<TutorAlternant | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  useEffect(() => {
    if (!session) return;
    api
      .getMyAlternants()
      .then((list) => setAlternant(list.find((a) => a.alternantProfilId === alternantId) ?? null))
      .catch(() => setAlternant(null))
      .finally(() => setLoaded(true));
  }, [session, alternantId]);

  if (isPending) return <Centered>Chargement…</Centered>;
  if (!session) return null;

  const pct =
    alternant && alternant.progress.total > 0
      ? Math.round((alternant.progress.evaluated / alternant.progress.total) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <Link to="/app/alternants" className="text-xs text-muted-foreground hover:text-brand">
        ← Mes alternants
      </Link>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : !alternant ? (
        <p className="text-sm text-muted-foreground">Alternant introuvable ou non rattaché.</p>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h1 className="text-xl font-bold tracking-tight">{alternant.name}</h1>
            <div className="mt-1 text-sm text-muted-foreground">{alternant.email}</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Promotion" value={alternant.promotionName ?? '—'} />
              <Field label="Entreprise" value={alternant.entrepriseName ?? '—'} />
              <Field
                label="Mon rôle"
                value={alternant.myRole === 'peda' ? 'Tuteur pédagogique' : "Tuteur d'entreprise"}
              />
            </div>
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                <span>Progression des compétences</span>
                <span>
                  {alternant.progress.evaluated}/{alternant.progress.total}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  params={{ alternantId }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-brand"
                >
                  <Icon className="h-5 w-5 text-brand" />
                  <span className="font-medium">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
