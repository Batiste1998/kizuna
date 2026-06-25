import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { schema, type NotificationType } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import type { AuthUser } from '../auth/auth.types';

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  detail?: string | null;
  href?: string | null;
}

type Notification = typeof schema.notification.$inferSelect;

@Injectable()
export class NotificationsService {
  constructor(private readonly database: DatabaseService) {}

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
