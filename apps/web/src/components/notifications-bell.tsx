import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  LifeBuoy,
  MessagesSquare,
  NotebookPen,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { api, type NotificationItem, type NotificationsList, type NotificationType } from '#/lib/api';
import { cn } from '#/lib/utils';

/** Per-type icon and tint for the notification rows. */
const TYPE_ICON: Record<NotificationType, { icon: LucideIcon; bg: string; text: string }> = {
  journal: { icon: NotebookPen, bg: '#E8F4EF', text: '#1F7A63' },
  message: { icon: MessagesSquare, bg: '#EAF0F8', text: '#3B63CC' },
  bilan: { icon: CalendarCheck, bg: '#F7EFDA', text: '#9A6B12' },
  echeance: { icon: CalendarClock, bg: '#FBEBE3', text: '#B54F2C' },
  ticket: { icon: LifeBuoy, bg: '#EFECFB', text: '#6B5BD2' },
  system: { icon: UserPlus, bg: '#EEF2FD', text: '#3B63CC' },
};

/** Compact relative time: "Il y a 1 h", "Hier", "Il y a 2 j". */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Hier';
  if (d < 7) return `Il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationsList | null>(null);

  function load() {
    api
      .getNotifications()
      .then(setData)
      .catch(() => setData({ unreadCount: 0, notifications: [] }));
  }

  useEffect(() => {
    load();
  }, []);

  function toggle() {
    if (!open) load();
    setOpen((o) => !o);
  }

  async function openNotification(n: NotificationItem) {
    setOpen(false);
    if (!n.read) {
      await api.markNotificationRead(n.id).catch(() => undefined);
      load();
    }
    if (n.href) void navigate({ to: n.href as '/app' });
  }

  async function markAll() {
    await api.markAllNotificationsRead().catch(() => undefined);
    load();
  }

  const unread = data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-secondary-foreground transition-colors hover:border-brand"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-[360px] overflow-hidden rounded-2xl border border-hairline bg-popover shadow-lg">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold tracking-tight">Notifications</span>
                {unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="text-[13px] font-semibold text-brand hover:underline"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-[28rem] overflow-y-auto border-t border-hairline">
              {!data || data.notifications.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Aucune notification.
                </p>
              ) : (
                data.notifications.map((n) => {
                  const meta = TYPE_ICON[n.type];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openNotification(n)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-hairline px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/60',
                        !n.read && 'bg-brand-soft/25',
                      )}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: meta.bg, color: meta.text }}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{n.title}</span>
                        {n.detail && (
                          <span className="block truncate text-[13px] text-muted-foreground">
                            {n.detail}
                          </span>
                        )}
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {relativeTime(n.createdAt)}
                        </span>
                      </span>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                    </button>
                  );
                })
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="block w-full border-t border-hairline py-3 text-center text-[13px] font-semibold text-brand-strong hover:bg-muted/50"
            >
              Voir toute l’activité
            </button>
          </div>
        </>
      )}
    </div>
  );
}
