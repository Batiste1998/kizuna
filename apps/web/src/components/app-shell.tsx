import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  FolderClosed,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessagesSquare,
  NotebookPen,
  ShieldCheck,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Me } from '#/lib/api';
import { navForMe, roleLabelForMe, themeRoleForMe, type NavIcon, type NavSection } from '#/lib/nav';
import { signOut } from '#/lib/auth-client';
import { cn } from '#/lib/utils';
import { NotificationsBell } from './notifications-bell';

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
};

/**
 * Persistent application frame for the /app/* space: a role-aware sidebar,
 * a top bar (notifications + sign-out) and the routed page content. The
 * `data-role` accent is derived from the user's primary role.
 */
export function AppShell({ me, children }: { me: Me; children: ReactNode }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = navForMe(me);
  const theme = themeRoleForMe(me);

  async function handleSignOut() {
    await signOut();
    toast.success('Déconnecté');
    void navigate({ to: '/login' });
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
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-card/70 px-4 py-3 backdrop-blur md:justify-end md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Brand className="md:hidden" />
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand md:flex"
            >
              <LogOut className="h-3.5 w-3.5" /> Se déconnecter
            </button>
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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar text-sm font-bold text-white">
        K
      </div>
      <span className="font-semibold">Kizuna</span>
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
        'flex-col gap-1 overflow-y-auto bg-sidebar px-3 py-4 text-white/80',
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white">
            K
          </div>
          <span className="font-semibold text-white">Kizuna</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/70 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-white/40 uppercase">
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
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                      activeProps={{ className: 'bg-white/15 text-white' }}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="px-2">
          <div className="truncate text-sm font-medium text-white">{me.name}</div>
          <div className="truncate text-xs text-white/50">{roleLabelForMe(me)}</div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Se déconnecter
        </button>
      </div>
    </aside>
  );
}
