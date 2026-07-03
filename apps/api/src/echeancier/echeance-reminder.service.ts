import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, gt, isNull, lte } from 'drizzle-orm';
import { schema } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';

/** How many days before the due date the reminder fires. */
const REMINDER_WINDOW_DAYS = 3;

/**
 * Daily sweep over upcoming échéances: every apprentice of the promotion gets
 * an in-app notification (mirrored to email by NotificationsService). The
 * `reminderSentAt` column guarantees a single reminder per échéance.
 */
@Injectable()
export class EcheanceReminderService {
  private readonly logger = new Logger(EcheanceReminderService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  private get db() {
    return this.database.db;
  }

  @Cron('0 7 * * *', { timeZone: 'Europe/Paris' })
  async remindUpcoming(): Promise<void> {
    const now = new Date();
    const horizon = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const upcoming = await this.db
      .select()
      .from(schema.echeance)
      .where(
        and(
          isNull(schema.echeance.reminderSentAt),
          gt(schema.echeance.dueDate, now),
          lte(schema.echeance.dueDate, horizon),
        ),
      );

    for (const echeance of upcoming) {
      const profils = await this.db
        .select({ userId: schema.alternantProfil.userId })
        .from(schema.alternantProfil)
        .where(eq(schema.alternantProfil.promotionId, echeance.promotionId));

      const days = Math.max(
        1,
        Math.ceil((echeance.dueDate.getTime() - now.getTime()) / 86_400_000),
      );
      await this.notifications.createMany(
        profils.map((p) => ({
          userId: p.userId,
          type: 'echeance' as const,
          title:
            days <= 1
              ? `Échéance demain : ${echeance.title}`
              : `Échéance dans ${days} jours : ${echeance.title}`,
          detail: echeance.description,
          href: '/app/echeancier',
        })),
      );
      await this.db
        .update(schema.echeance)
        .set({ reminderSentAt: now, updatedAt: now })
        .where(eq(schema.echeance.id, echeance.id));
      this.logger.log(
        `Rappel émis pour l'échéance « ${echeance.title} » (${profils.length} alternant(s))`,
      );
    }
  }
}
