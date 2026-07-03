import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { schema, type NotificationType } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import { mailLayout } from '../mail/mail-layout';
import type { AuthUser } from '../auth/auth.types';

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  detail?: string | null;
  href?: string | null;
}

type Notification = typeof schema.notification.$inferSelect;

/**
 * Notification types that also trigger an email. High-frequency conversational
 * events (journal, messagerie) stay in-app only to avoid spamming inboxes.
 */
const EMAILED_TYPES: NotificationType[] = ['bilan', 'echeance', 'ticket', 'system'];

@Injectable()
export class NotificationsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  private get db() {
    return this.database.db;
  }

  /** Emit one notification (best-effort; never throws to the caller's flow). */
  async create(input: NotificationInput): Promise<void> {
    await this.db
      .insert(schema.notification)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        detail: input.detail ?? null,
        href: input.href ?? null,
      })
      .catch(() => undefined);
    void this.emailFor([input]);
  }

  /** Emit several notifications at once (deduplicated by userId, skips empties). */
  async createMany(inputs: NotificationInput[]): Promise<void> {
    const rows = inputs
      .filter((i) => i.userId)
      .map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        detail: i.detail ?? null,
        href: i.href ?? null,
      }));
    if (rows.length === 0) return;
    await this.db
      .insert(schema.notification)
      .values(rows)
      .catch(() => undefined);
    void this.emailFor(rows);
  }

  /** Mirrors important notifications to email (best-effort, fire-and-forget). */
  private async emailFor(inputs: NotificationInput[]): Promise<void> {
    try {
      const toSend = inputs.filter((i) => i.userId && EMAILED_TYPES.includes(i.type));
      if (toSend.length === 0) return;
      const users = await this.db
        .select({ id: schema.user.id, email: schema.user.email })
        .from(schema.user)
        .where(inArray(schema.user.id, [...new Set(toSend.map((i) => i.userId))]));
      const emailById = new Map(users.map((u) => [u.id, u.email]));
      const webUrl = this.config.get<string>('WEB_PUBLIC_URL') ?? 'http://localhost:3000';
      await Promise.all(
        toSend.map((n) => {
          const to = emailById.get(n.userId);
          if (!to) return Promise.resolve();
          return this.mail.sendMail({
            to,
            subject: `Kizuna — ${n.title}`,
            html: mailLayout(
              n.title,
              n.detail ?? '',
              n.href ? { url: `${webUrl}${n.href}`, label: 'Ouvrir Kizuna' } : undefined,
            ),
            text: `${n.title}${n.detail ? `\n${n.detail}` : ''}${n.href ? `\n${webUrl}${n.href}` : ''}`,
          });
        }),
      );
    } catch {
      // Emails are a mirror of in-app notifications: failures must never surface.
    }
  }

  async list(user: AuthUser): Promise<{ unreadCount: number; notifications: Notification[] }> {
    const notifications = await this.db
      .select()
      .from(schema.notification)
      .where(eq(schema.notification.userId, user.id))
      .orderBy(desc(schema.notification.createdAt))
      .limit(30);
    const unread = await this.db
      .select({ id: schema.notification.id })
      .from(schema.notification)
      .where(and(eq(schema.notification.userId, user.id), eq(schema.notification.read, false)));
    return { unreadCount: unread.length, notifications };
  }

  async markAllRead(user: AuthUser): Promise<{ ok: true }> {
    await this.db
      .update(schema.notification)
      .set({ read: true })
      .where(eq(schema.notification.userId, user.id));
    return { ok: true };
  }

  async markRead(user: AuthUser, id: string): Promise<{ ok: true }> {
    await this.db
      .update(schema.notification)
      .set({ read: true })
      .where(and(eq(schema.notification.id, id), eq(schema.notification.userId, user.id)));
    return { ok: true };
  }
}
