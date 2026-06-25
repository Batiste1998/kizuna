import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useSession } from '#/lib/auth-client';
import {
  api,
  type AdminAlternant,
  type AdminEntreprise,
  type AdminMember,
  type AdminOverview,
  type AdminPromotion,
} from '#/lib/api';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Centered } from '#/components/shell';

export const Route = createFileRoute('/app/admin')({
  component: AdminPage,
});

function AdminPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [alternants, setAlternants] = useState<AdminAlternant[]>([]);
  const [entreprises, setEntreprises] = useState<AdminEntreprise[]>([]);
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  function reloadEntreprises() {
    api
      .adminEntreprises()
      .then(setEntreprises)
      .catch(() => undefined);
  }
  function reloadPromotions() {
    api
      .adminPromotions()
      .then(setPromotions)
      .catch(() => undefined);
  }

  useEffect(() => {
    if (!session) return;
    api
      .adminOverview()
      .then((o) => {
        setOverview(o);
        api
          .adminAlternants()
          .then(setAlternants)
          .catch(() => undefined);
        api
          .adminMembers()
          .then(setMembers)
          .catch(() => undefined);
        reloadEntreprises();
        reloadPromotions();
      })
      .catch(() => setForbidden(true));
  }, [session]);

  if (isPending) return <Centered>Chargement…</Centered>;
  if (!session) return null;
  if (forbidden) {
    return (
      <Centered>
        <div className="text-center">
          <p className="font-medium">Espace réservé aux administrateurs d’établissement.</p>
          <Link to="/app" className="mt-4 inline-block text-sm text-brand hover:underline">
            ← Retour
          </Link>
        </div>
      </Centered>
    );
  }
  if (!overview) return <Centered>Chargement…</Centered>;

  return (
    <main data-role="admin" className="min-h-screen">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <Link to="/app" className="text-xs text-muted-foreground hover:text-brand">
            ← Espace
          </Link>
          <h1 className="text-lg font-bold tracking-tight">
            Administration · {overview.organizationName}
          </h1>
        </div>
      </header>

      <section className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Alternants" value={overview.counts.alternants} />
          <Kpi label="Membres" value={overview.counts.members} />
          <Kpi label="Entreprises" value={overview.counts.entreprises} />
          <Kpi label="Promotions" value={overview.counts.promotions} />
        </div>

        <Block title="Alternants">
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-semibold">Nom</th>
                  <th className="px-4 py-2 font-semibold">Promotion</th>
                  <th className="px-4 py-2 font-semibold">Entreprise</th>
                  <th className="px-4 py-2 font-semibold">Tuteur péda.</th>
                  <th className="px-4 py-2 font-semibold">Tuteur entr.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alternants.map((a) => (
                  <tr key={a.alternantProfilId}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.promotionName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.entrepriseName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.tuteurPedaName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {a.tuteurEntrepriseName ?? '—'}
                    </td>
                  </tr>
                ))}
                {alternants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Aucun alternant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Block>

        <Block title="Entreprises">
          <EntrepriseForm onCreated={reloadEntreprises} />
          <div className="grid gap-3 sm:grid-cols-2">
            {entreprises.map((e) => (
              <div
                key={e.id}
                className="flex items-start justify-between gap-2 rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div>
                  <div className="font-semibold">{e.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[e.sector, e.city].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await api
                      .deleteAdminEntreprise(e.id)
                      .catch((err: Error) => toast.error(err.message));
                    reloadEntreprises();
                  }}
                >
                  Supprimer
                </Button>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Promotions">
          <PromotionForm onCreated={reloadPromotions} />
          <div className="grid gap-3 sm:grid-cols-2">
            {promotions.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.rncpLevel ? `Niveau ${p.rncpLevel}` : 'Niveau —'}
                  {p.periodStart ? ` · ${p.periodStart} → ${p.periodEnd ?? '…'}` : ''}
                </div>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Membres">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{m.email}</span>
                  </div>
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-strong">
                    {m.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Block>
      </section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

function EntrepriseForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createAdminEntreprise({
        name,
        sector: sector || undefined,
        city: city || undefined,
      });
      setName('');
      setSector('');
      setCity('');
      onCreated();
      toast.success('Entreprise ajoutée');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"
    >
      <Input
        required
        maxLength={200}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom"
      />
      <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Secteur" />
      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" />
      <Button type="submit" disabled={busy || !name}>
        Ajouter
      </Button>
    </form>
  );
}

function PromotionForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createAdminPromotion({
        name,
        rncpLevel: level ? Number(level) : undefined,
      });
      setName('');
      setLevel('');
      onCreated();
      toast.success('Promotion créée');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[1fr_auto_auto] sm:items-center"
    >
      <Input
        required
        maxLength={200}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de la promotion"
      />
      <Input
        type="number"
        min={1}
        max={8}
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        placeholder="Niveau RNCP"
        className="w-32"
      />
      <Button type="submit" disabled={busy || !name}>
        Créer
      </Button>
    </form>
  );
}
