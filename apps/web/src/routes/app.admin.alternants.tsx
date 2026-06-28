import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Mail, Pencil, Search, Trash2, UserPlus, X } from 'lucide-react';
import { api, type AdminAlternant, type AlternantSuivi } from '#/lib/api';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Avatar, PageHead, Panel } from '#/components/super-ui';
import { cn } from '#/lib/utils';
import { AssociationEditor, MemberForm, useAdminData } from '#/components/admin-forms';

export const Route = createFileRoute('/app/admin/alternants')({
  component: AdminAlternantsPage,
});

const SUIVI_META: Record<AlternantSuivi, { label: string; bg: string; text: string }> = {
  a_jour: { label: 'À jour', bg: '#E4F2EC', text: '#2C7A63' },
  en_retard: { label: 'En retard', bg: '#FBE5E0', text: '#C0492C' },
  a_completer: { label: 'À compléter', bg: '#F7EFDA', text: '#9A6B12' },
};

const FILTERS: Array<{ key: 'all' | AlternantSuivi; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'a_jour', label: 'À jour' },
  { key: 'en_retard', label: 'En retard' },
  { key: 'a_completer', label: 'À compléter' },
];

function AdminAlternantsPage() {
  const { alternants, members, entreprises, promotions, reload } = useAdminData();
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | AlternantSuivi>('all');
  const [editing, setEditing] = useState<AdminAlternant | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void api
      .adminSchools()
      .then((d) => setSchoolName(d.schools.find((s) => s.id === d.activeId)?.name ?? null))
      .catch(() => undefined);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: alternants.length, a_jour: 0, en_retard: 0, a_completer: 0 };
    for (const a of alternants) c[a.suivi] = (c[a.suivi] ?? 0) + 1;
    return c;
  }, [alternants]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alternants.filter((a) => {
      if (filter !== 'all' && a.suivi !== filter) return false;
      if (!q) return true;
      return (a.name ?? '').toLowerCase().includes(q) || (a.email ?? '').toLowerCase().includes(q);
    });
  }, [alternants, search, filter]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
      <PageHead
        title="Alternants"
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus /> Nouvel alternant
          </Button>
        }
      >
        {schoolName ? `Les alternants de ${schoolName}, ` : 'Vos alternants, '}leur entreprise, leurs
        tuteurs et l’état de leur suivi.
      </PageHead>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un alternant…"
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'border-transparent bg-foreground text-background'
                    : 'border-hairline bg-card text-secondary-foreground hover:border-brand',
                )}
              >
                {f.label}
                <span className={cn('text-[11px]', active ? 'text-background/70' : 'text-muted-foreground')}>
                  {counts[f.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <th className="px-5 py-3">Alternant</th>
                <th className="px-4 py-3">Promotion</th>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Tuteur péda.</th>
                <th className="px-4 py-3">Tuteur entreprise</th>
                <th className="px-4 py-3">Suivi</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const suivi = SUIVI_META[a.suivi];
                return (
                  <tr key={a.alternantProfilId} className="border-b border-hairline last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative inline-flex">
                          <Avatar name={a.name} role="alternant" size={36} />
                          <span
                            className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-card"
                            style={{ background: a.suivi === 'a_jour' ? '#2E9E82' : '#D6A33A' }}
                          />
                        </span>
                        <div>
                          <Link
                            to="/app/alternants/$alternantId"
                            params={{ alternantId: a.alternantProfilId }}
                            className="text-sm font-semibold whitespace-nowrap underline decoration-transparent underline-offset-2 transition-colors hover:text-brand-strong hover:decoration-current"
                          >
                            {a.name ?? '—'}
                          </Link>
                          <div className="text-xs text-muted-foreground">{a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.promotionName ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.entrepriseName ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {a.tuteurPedaName ?? <span className="text-muted-foreground/60 italic">Non assigné</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {a.tuteurEntrepriseName ?? (
                        <span className="text-muted-foreground/60 italic">Non assigné</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap"
                        style={{ background: suivi.bg, color: suivi.text }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: suivi.text }} />
                        {suivi.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconAction
                          title="Envoyer un email"
                          href={a.email ? `mailto:${a.email}` : undefined}
                          icon={<Mail className="h-4 w-4" />}
                        />
                        <IconAction
                          title="Modifier le trinôme"
                          onClick={() => setEditing(a)}
                          icon={<Pencil className="h-4 w-4" />}
                        />
                        <IconAction
                          title="Supprimer"
                          danger
                          disabled
                          icon={<Trash2 className="h-4 w-4" />}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">
            Aucun alternant pour ce filtre.
          </div>
        )}
      </Panel>

      {editing && (
        <Slideover
          title="Modifier le trinôme"
          subtitle={editing.name ?? undefined}
          onClose={() => setEditing(null)}
        >
          <AssociationEditor
            alternantProfilId={editing.alternantProfilId}
            members={members}
            entreprises={entreprises}
            initial={{
              tuteurPedaName: editing.tuteurPedaName,
              tuteurEntrepriseName: editing.tuteurEntrepriseName,
              entrepriseName: editing.entrepriseName,
            }}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        </Slideover>
      )}

      {creating && (
        <Slideover
          title="Nouvel alternant"
          subtitle="Créez le compte et rattachez-le à une promotion."
          onClose={() => setCreating(false)}
        >
          <MemberForm
            promotions={promotions}
            defaultRole="alternant"
            onCreated={reload}
            onClose={() => setCreating(false)}
          />
        </Slideover>
      )}
    </div>
  );
}

function IconAction({
  title,
  icon,
  onClick,
  href,
  danger,
  disabled,
}: {
  title: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  const className = cn(
    'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors',
    disabled
      ? 'cursor-not-allowed opacity-40'
      : danger
        ? 'hover:bg-[#FBEBE3] hover:text-[#B54F2C]'
        : 'hover:bg-muted hover:text-secondary-foreground',
  );
  if (href && !disabled) {
    return (
      <a href={href} title={title} aria-label={title} className={className}>
        {icon}
      </a>
    );
  }
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className={className}>
      {icon}
    </button>
  );
}

export function Slideover({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-[460px] max-w-[92vw] flex-col bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-hairline px-6 py-5">
          <div>
            <div className="text-lg font-bold tracking-tight">{title}</div>
            {subtitle && <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </aside>
    </div>
  );
}
