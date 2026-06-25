import { Fragment, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
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

const MEMBER_ROLE_OPTIONS: Array<{ value: AdminMember['role']; label: string }> = [
  { value: 'alternant', label: 'Alternant' },
  { value: 'tuteur_pedagogique', label: 'Tuteur pédagogique' },
  { value: 'tuteur_entreprise', label: "Tuteur d'entreprise" },
  { value: 'admin', label: 'Administrateur' },
];

const selectClass =
  'h-9 rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus:border-brand focus:outline-none';

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
  const [editingAssoc, setEditingAssoc] = useState<string | null>(null);

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
  function reloadAlternants() {
    api
      .adminAlternants()
      .then(setAlternants)
      .catch(() => undefined);
  }
  function reloadMembers() {
    api
      .adminMembers()
      .then(setMembers)
      .catch(() => undefined);
  }
  function reloadOverview() {
    api
      .adminOverview()
      .then(setOverview)
      .catch(() => undefined);
  }

  useEffect(() => {
    if (!session) return;
    api
      .adminOverview()
      .then((o) => {
        setOverview(o);
        reloadAlternants();
        reloadMembers();
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

        <Block title="Onboarding">
          <MemberForm
            promotions={promotions}
            onCreated={() => {
              reloadMembers();
              reloadAlternants();
              reloadOverview();
            }}
          />
        </Block>

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
                  <th className="px-4 py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alternants.map((a) => (
                  <Fragment key={a.alternantProfilId}>
                    <tr>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">{a.email}</div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{a.promotionName ?? '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {a.entrepriseName ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {a.tuteurPedaName ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {a.tuteurEntrepriseName ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setEditingAssoc((id) =>
                              id === a.alternantProfilId ? null : a.alternantProfilId,
                            )
                          }
                        >
                          {editingAssoc === a.alternantProfilId ? 'Fermer' : 'Trinôme'}
                        </Button>
                      </td>
                    </tr>
                    {editingAssoc === a.alternantProfilId && (
                      <tr>
                        <td colSpan={6} className="bg-muted/40 px-4 py-3">
                          <AssociationEditor
                            members={members}
                            entreprises={entreprises}
                            onSaved={() => {
                              setEditingAssoc(null);
                              reloadAlternants();
                            }}
                            alternantProfilId={a.alternantProfilId}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {alternants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
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

function MemberForm({
  promotions,
  onCreated,
}: {
  promotions: AdminPromotion[];
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminMember['role']>('alternant');
  const [promotionId, setPromotionId] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await api.createAdminMember({
        name,
        email,
        role: role as 'alternant',
        promotionId: role === 'alternant' && promotionId ? promotionId : undefined,
      });
      setName('');
      setEmail('');
      setPromotionId('');
      onCreated();
      if (created.temporaryPassword) {
        toast.success('Compte créé', {
          description: `Mot de passe temporaire : ${created.temporaryPassword}`,
          duration: 15000,
        });
      } else {
        toast.success('Membre rattaché à l’établissement');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom complet"
        />
        <Input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
        <select
          className={selectClass}
          value={role}
          onChange={(e) => setRole(e.target.value as AdminMember['role'])}
        >
          {MEMBER_ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {role === 'alternant' ? (
          <select
            className={selectClass}
            value={promotionId}
            onChange={(e) => setPromotionId(e.target.value)}
          >
            <option value="">Promotion (optionnel)</option>
            {promotions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}
        <Button type="submit" disabled={busy || !name || !email}>
          Créer
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Le compte est créé avec un mot de passe temporaire à transmettre (l’envoi d’invitation par
        email arrive prochainement).
      </p>
    </form>
  );
}

function AssociationEditor({
  alternantProfilId,
  members,
  entreprises,
  onSaved,
}: {
  alternantProfilId: string;
  members: AdminMember[];
  entreprises: AdminEntreprise[];
  onSaved: () => void;
}) {
  const pedaMembers = useMemo(
    () => members.filter((m) => m.role === 'tuteur_pedagogique'),
    [members],
  );
  const entrepriseMembers = useMemo(
    () => members.filter((m) => m.role === 'tuteur_entreprise'),
    [members],
  );
  const [tuteurPedaUserId, setTuteurPedaUserId] = useState('');
  const [tuteurEntrepriseUserId, setTuteurEntrepriseUserId] = useState('');
  const [entrepriseId, setEntrepriseId] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.upsertAdminAssociation(alternantProfilId, {
        tuteurPedaUserId: tuteurPedaUserId || undefined,
        tuteurEntrepriseUserId: tuteurEntrepriseUserId || undefined,
        entrepriseId: entrepriseId || undefined,
      });
      toast.success('Trinôme mis à jour');
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
      <select
        className={selectClass}
        value={tuteurPedaUserId}
        onChange={(e) => setTuteurPedaUserId(e.target.value)}
      >
        <option value="">Tuteur pédagogique…</option>
        {pedaMembers.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name ?? m.email}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={tuteurEntrepriseUserId}
        onChange={(e) => setTuteurEntrepriseUserId(e.target.value)}
      >
        <option value="">Tuteur d’entreprise…</option>
        {entrepriseMembers.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name ?? m.email}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={entrepriseId}
        onChange={(e) => setEntrepriseId(e.target.value)}
      >
        <option value="">Entreprise…</option>
        {entreprises.map((en) => (
          <option key={en.id} value={en.id}>
            {en.name}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        onClick={save}
        disabled={busy || (!tuteurPedaUserId && !tuteurEntrepriseUserId && !entrepriseId)}
      >
        Enregistrer
      </Button>
    </div>
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
