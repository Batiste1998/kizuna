import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Bell } from 'lucide-react';
import { api, type NotificationItem, type NotificationsList } from '#/lib/api';
import { NOTIFICATION_TYPE_META } from '#/lib/levels';
import { cn } from '#/lib/utils';

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
    // href is a known app path produced by the server; cast for the typed router.
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
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="text-xs text-brand hover:underline"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!data || data.notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Aucune notification.
                </p>
              ) : (
                data.notifications.map((n) => {
                  const meta = NOTIFICATION_TYPE_META[n.type];
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openNotification(n)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent',
                        !n.read && 'bg-brand-soft/30',
                      )}
                    >
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', meta.dot)} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{n.title}</span>
                        {n.detail && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {n.detail}
                          </span>
                        )}
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </span>
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
