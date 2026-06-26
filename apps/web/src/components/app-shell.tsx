import { useEffect, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Briefcase,
  Building2,
  CalendarClock,
  Check,
  ChevronsUpDown,
  ClipboardCheck,
  FolderClosed,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  LogOut,
  Menu,
  MessagesSquare,
  NotebookPen,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type Me } from '#/lib/api';
import { navForMe, roleLabelForMe, themeRoleForMe, type NavIcon, type NavSection } from '#/lib/nav';
import { authClient, signOut } from '#/lib/auth-client';
import { cn } from '#/lib/utils';
import { NotificationsBell } from './notifications-bell';
import { Logo } from './logo';

const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  competences: GraduationCap,
  journal: NotebookPen,
  bilans: ClipboardCheck,
  echeancier: CalendarClock,
  messagerie: MessagesSquare,
  documents: FolderClosed,
  alternants: Users,
  admin: Building2,
  superadmin: ShieldCheck,
  support: LifeBuoy,
  compte: UserCog,
  users: Users,
  ecoles: GraduationCap,
  settings: SlidersHorizontal,
  associations: Link2,
  membres: Users,
  entreprises: Briefcase,
  promotions: GraduationCap,
};

/**
 * Persistent application frame for the /app/* space: a role-aware sidebar,
 * a top bar (notifications + sign-out) and the routed page content. The
 * `data-role` accent is derived from the user's primary role.
 */
export function AppShell({ me, children }: { me: Me; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = navForMe(me);
  const theme = themeRoleForMe(me);

  async function handleSignOut() {
    await signOut();
    // Full navigation so the cleared session can't be read back by an in-flight SPA render.
    window.location.href = '/login';
  }

  return (
    <div
      data-role={theme}
      className="min-h-screen bg-background md:grid md:grid-cols-[260px_1fr]"
    >
      <SidebarNav
        sections={sections}
        me={me}
        onSignOut={handleSignOut}
        className="hidden md:flex"
      />

      <div className="flex min-h-screen flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-background/75 px-4 py-3 backdrop-blur-md md:justify-end md:px-7">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-card shadow-sm md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Brand className="md:hidden" />
          <div className="flex items-center gap-2">
            <NotificationsBell />
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <SidebarNav
            sections={sections}
            me={me}
            onSignOut={handleSignOut}
            onNavigate={() => setMobileOpen(false)}
            onClose={() => setMobileOpen(false)}
            className="absolute inset-y-0 left-0 flex w-72"
          />
        </div>
      )}
    </div>
  );
}

function Brand({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Logo className="h-9 w-9" />
      <span className="font-bold tracking-tight">Kizuna</span>
    </div>
  );
}

function SidebarNav({
  sections,
  me,
  onSignOut,
  onNavigate,
  onClose,
  className,
}: {
  sections: NavSection[];
  me: Me;
  onSignOut: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        'flex-col gap-1 overflow-y-auto border-r border-hairline bg-sidebar px-3.5 py-5 text-secondary-foreground md:sticky md:top-0 md:h-screen',
        className,
      )}
    >
      <div className="mb-5 flex items-center justify-between px-1.5">
        <div className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <div className="leading-tight">
            <div className="font-bold tracking-tight">Kizuna</div>
            <div className="text-[11px] font-medium text-muted-foreground">Suivi d’alternance</div>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-card"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <SchoolSwitcher me={me} />

      <nav className="flex-1 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="px-2.5 pb-1.5 text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
              {section.title}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to as '/app'}
                      activeOptions={{ exact: item.to === '/app' }}
                      onClick={onNavigate}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-card"
                      activeProps={{
                        className:
                          'bg-brand-soft text-brand-strong font-semibold shadow-sm hover:bg-brand-soft',
                      }}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-5 flex items-center gap-2.5 rounded-2xl border border-hairline bg-card p-2.5 shadow-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">
          {initials(me.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{me.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{roleLabelForMe(me)}</div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Se déconnecter"
          title="Se déconnecter"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

/**
 * Active-school selector for admins who manage several establishments. Changing
 * the school updates the session's active organization, then reloads so every
 * "Espace école" view reflects the new context.
 */
function SchoolSwitcher({ me }: { me: Me }) {
  const isAdmin =
    me.role !== 'super_admin' && me.memberRoles.some((r) => r === 'admin' || r === 'owner');
  const [data, setData] = useState<{
    activeId: string | null;
    schools: Array<{ id: string; name: string; city: string | null }>;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .adminSchools()
      .then(setData)
      .catch(() => undefined);
  }, [isAdmin]);

  if (!isAdmin || !data || data.schools.length === 0) return null;

  const active = data.schools.find((s) => s.id === data.activeId) ?? data.schools[0];
  const multi = data.schools.length > 1;

  async function choose(id: string) {
    setOpen(false);
    if (id === active.id) return;
    setSwitching(true);
    try {
      await authClient.organization.setActive({ organizationId: id });
      window.location.reload();
    } catch {
      toast.error('Changement d’établissement impossible');
      setSwitching(false);
    }
  }

  return (
    <div className="relative mb-4">
      <button
        type="button"
        onClick={() => multi && setOpen((o) => !o)}
        disabled={switching}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-xl border border-hairline bg-card px-2.5 py-2 text-left shadow-sm',
          multi && 'transition-colors hover:border-brand',
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-bold text-brand-strong">
          {initials(active.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{active.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {multi ? `${data.schools.length} écoles` : (active.city ?? 'Établissement')}
          </div>
        </div>
        {multi && <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {open && multi && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 top-full z-30 mt-1.5 rounded-xl border border-hairline bg-popover p-1.5 shadow-lg">
            <div className="px-2 pt-1 pb-1.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Mes établissements
            </div>
            {data.schools.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => choose(s.id)}
                disabled={switching}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-soft text-[11px] font-bold text-brand-strong">
                  {initials(s.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{s.name}</span>
                  {s.city && <span className="block truncate text-[11px] text-muted-foreground">{s.city}</span>}
                </span>
                {s.id === active.id && <Check className="h-4 w-4 shrink-0 text-brand-strong" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function initials(name?: string) {
  if (!name) return '·';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}
