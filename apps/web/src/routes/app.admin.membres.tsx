import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Search, UserPlus } from 'lucide-react';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Avatar, PageHead, Panel, RoleBadge } from '#/components/super-ui';
import { MemberForm, useAdminData } from '#/components/admin-forms';
import { Slideover } from './app.admin.alternants';

export const Route = createFileRoute('/app/admin/membres')({
  component: AdminMembresPage,
});

function AdminMembresPage() {
  const { members, promotions, reload } = useAdminData();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => (m.name ?? '').toLowerCase().includes(q) || (m.email ?? '').toLowerCase().includes(q),
    );
  }, [members, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
      <PageHead
        title="Membres"
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus /> Nouveau membre
          </Button>
        }
      >
        Les comptes rattachés à votre établissement : administrateurs, tuteurs et alternants.
      </PageHead>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un membre…"
          className="pl-10"
        />
      </div>

      <Panel className="overflow-hidden">
        <ul>
          {filtered.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 border-b border-hairline px-5 py-3 last:border-0 hover:bg-muted/40"
            >
              <Avatar name={m.name} role={m.role} size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{m.name ?? '—'}</div>
                <div className="truncate text-xs text-muted-foreground">{m.email}</div>
              </div>
              <RoleBadge role={m.role} />
            </li>
          ))}
        </ul>
        {filtered.length === 0 && (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">Aucun membre.</div>
        )}
      </Panel>

      {creating && (
        <Slideover
          title="Nouveau membre"
          subtitle="Créez un compte et rattachez-le à votre établissement."
          onClose={() => setCreating(false)}
        >
          <MemberForm
            promotions={promotions}
            defaultRole="tuteur_pedagogique"
            onCreated={reload}
            onClose={() => setCreating(false)}
          />
        </Slideover>
      )}
    </div>
  );
}
