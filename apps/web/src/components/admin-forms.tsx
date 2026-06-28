import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  api,
  type AdminAlternant,
  type AdminEntreprise,
  type AdminMember,
  type AdminPromotion,
} from '#/lib/api';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';

/** Loads the admin roster (alternants, members, entreprises, promotions) for the current school. */
export function useAdminData() {
  const [alternants, setAlternants] = useState<AdminAlternant[]>([]);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [entreprises, setEntreprises] = useState<AdminEntreprise[]>([]);
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);

  const reload = useCallback(() => {
    void api.adminAlternants().then(setAlternants).catch(() => undefined);
    void api.adminMembers().then(setMembers).catch(() => undefined);
    void api.adminEntreprises().then(setEntreprises).catch(() => undefined);
    void api.adminPromotions().then(setPromotions).catch(() => undefined);
  }, []);

  useEffect(() => reload(), [reload]);

  return { alternants, members, entreprises, promotions, reload };
}

export const selectClass =
  'h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm shadow-xs transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-ring/15';

export const MEMBER_ROLE_OPTIONS: Array<{ value: AdminMember['role']; label: string }> = [
  { value: 'alternant', label: 'Alternant' },
  { value: 'tuteur_pedagogique', label: 'Tuteur pédagogique' },
  { value: 'tuteur_entreprise', label: "Tuteur d'entreprise" },
  { value: 'admin', label: 'Administrateur' },
];

/** Shown when a non-admin lands on an "Espace école" page. */
export function ForbiddenAdmin() {
  return (
    <div className="mx-auto grid max-w-5xl place-items-center px-6 py-24 text-center">
      <div>
        <p className="font-semibold">Espace réservé aux administrateurs d’établissement.</p>
        <Link to="/app" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
          ← Retour à l’accueil
        </Link>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-secondary-foreground">{label}</span>
      {children}
    </label>
  );
}

export function MemberForm({
  promotions,
  defaultRole = 'alternant',
  onCreated,
  onClose,
}: {
  promotions: AdminPromotion[];
  defaultRole?: AdminMember['role'];
  onCreated: () => void;
  onClose?: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminMember['role']>(defaultRole);
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
      onClose?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nom complet">
          <Input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="Camille Moreau" />
        </Field>
        <Field label="Adresse email">
          <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="camille@ecole.fr" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Rôle">
          <select className={selectClass} value={role} onChange={(e) => setRole(e.target.value as AdminMember['role'])}>
            {MEMBER_ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        {role === 'alternant' && (
          <Field label="Promotion (optionnel)">
            <select className={selectClass} value={promotionId} onChange={(e) => setPromotionId(e.target.value)}>
              <option value="">—</option>
              {promotions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Le compte est créé avec un mot de passe temporaire à transmettre (l’envoi d’invitation par email
        arrive prochainement).
      </p>
      <div className="flex justify-end gap-2.5">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={busy || !name || !email}>
          {busy ? 'Création…' : 'Créer le compte'}
        </Button>
      </div>
    </form>
  );
}

export function EntrepriseForm({ onCreated, onClose }: { onCreated: () => void; onClose?: () => void }) {
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createAdminEntreprise({ name, sector: sector || undefined, city: city || undefined });
      setName('');
      setSector('');
      setCity('');
      onCreated();
      toast.success('Entreprise ajoutée');
      onClose?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nom de l’entreprise">
        <Input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Secteur">
          <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Tech, conseil…" />
        </Field>
        <Field label="Ville">
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" />
        </Field>
      </div>
      <div className="flex justify-end gap-2.5">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={busy || !name}>
          Ajouter l’entreprise
        </Button>
      </div>
    </form>
  );
}

export function PromotionForm({ onCreated, onClose }: { onCreated: () => void; onClose?: () => void }) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createAdminPromotion({ name, rncpLevel: level ? Number(level) : undefined });
      setName('');
      setLevel('');
      onCreated();
      toast.success('Promotion créée');
      onClose?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nom de la promotion">
        <Input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="Expert Dév. Full Stack" />
      </Field>
      <Field label="Niveau RNCP">
        <Input type="number" min={1} max={8} value={level} onChange={(e) => setLevel(e.target.value)} placeholder="7" className="w-32" />
      </Field>
      <div className="flex justify-end gap-2.5">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={busy || !name}>
          Créer la promotion
        </Button>
      </div>
    </form>
  );
}

export function AssociationEditor({
  alternantProfilId,
  members,
  entreprises,
  initial,
  onSaved,
}: {
  alternantProfilId: string;
  members: AdminMember[];
  entreprises: AdminEntreprise[];
  initial?: {
    tuteurPedaName?: string | null;
    tuteurEntrepriseName?: string | null;
    entrepriseName?: string | null;
  };
  onSaved: () => void;
}) {
  const pedaMembers = useMemo(() => members.filter((m) => m.role === 'tuteur_pedagogique'), [members]);
  const entrepriseMembers = useMemo(
    () => members.filter((m) => m.role === 'tuteur_entreprise'),
    [members],
  );
  const [tuteurPedaUserId, setTuteurPedaUserId] = useState('');
  const [tuteurEntrepriseUserId, setTuteurEntrepriseUserId] = useState('');
  const [entrepriseId, setEntrepriseId] = useState('');
  const [busy, setBusy] = useState(false);

  // Pre-select the apprentice's current trinôme by matching the displayed names.
  useEffect(() => {
    if (!initial) return;
    if (initial.tuteurPedaName) {
      const m = pedaMembers.find((x) => (x.name ?? x.email) === initial.tuteurPedaName);
      if (m) setTuteurPedaUserId(m.userId);
    }
    if (initial.tuteurEntrepriseName) {
      const m = entrepriseMembers.find((x) => (x.name ?? x.email) === initial.tuteurEntrepriseName);
      if (m) setTuteurEntrepriseUserId(m.userId);
    }
    if (initial.entrepriseName) {
      const e = entreprises.find((x) => x.name === initial.entrepriseName);
      if (e) setEntrepriseId(e.id);
    }
  }, [initial, pedaMembers, entrepriseMembers, entreprises]);

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
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Tuteur pédagogique">
        <select className={selectClass} value={tuteurPedaUserId} onChange={(e) => setTuteurPedaUserId(e.target.value)}>
          <option value="">—</option>
          {pedaMembers.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name ?? m.email}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tuteur d’entreprise">
        <select className={selectClass} value={tuteurEntrepriseUserId} onChange={(e) => setTuteurEntrepriseUserId(e.target.value)}>
          <option value="">—</option>
          {entrepriseMembers.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name ?? m.email}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Entreprise">
        <select className={selectClass} value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)}>
          <option value="">—</option>
          {entreprises.map((en) => (
            <option key={en.id} value={en.id}>
              {en.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-3">
        <Button
          size="sm"
          onClick={save}
          disabled={busy || (!tuteurPedaUserId && !tuteurEntrepriseUserId && !entrepriseId)}
        >
          Enregistrer le trinôme
        </Button>
      </div>
    </div>
  );
}
