import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import { schema, type TicketPriority, type TicketStatus, type TicketType } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../auth/auth.types';

export interface TicketSummary {
  id: string;
  ref: string;
  subject: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  requesterName: string | null;
  assigneeName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketMessageView {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string | null;
  authorIsSupport: boolean;
}

type TicketRow = typeof schema.ticket.$inferSelect;

@Injectable()
export class SupportService {
  constructor(
    private readonly database: DatabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  private get db() {
    return this.database.db;
  }

  private canTriage(user: AuthUser): boolean {
    return user.role === 'support' || user.role === 'super_admin';
  }

  private ref(n: number): string {
    return `KZ-${String(n).padStart(4, '0')}`;
  }

  private async withNames(tickets: TicketRow[]): Promise<TicketSummary[]> {
    const ids = [
      ...new Set(tickets.flatMap((t) => [t.requesterUserId, t.assigneeUserId].filter(Boolean))),
    ] as string[];
    const users = ids.length
      ? await this.db
          .select({ id: schema.user.id, name: schema.user.name })
          .from(schema.user)
          .where(inArray(schema.user.id, ids))
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return tickets.map((t) => ({
      id: t.id,
      ref: this.ref(t.number),
      subject: t.subject,
      type: t.type,
      priority: t.priority,
      status: t.status,
      requesterName: nameById.get(t.requesterUserId) ?? null,
      assigneeName: t.assigneeUserId ? (nameById.get(t.assigneeUserId) ?? null) : null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  async list(user: AuthUser): Promise<{ canTriage: boolean; tickets: TicketSummary[] }> {
    const triage = this.canTriage(user);
    const rows = triage
      ? await this.db.select().from(schema.ticket).orderBy(desc(schema.ticket.updatedAt))
      : await this.db
          .select()
          .from(schema.ticket)
          .where(eq(schema.ticket.requesterUserId, user.id))
          .orderBy(desc(schema.ticket.updatedAt));
    return { canTriage: triage, tickets: await this.withNames(rows) };
  }

  async create(
    user: AuthUser,
    input: { subject: string; type: TicketType; priority?: TicketPriority; description: string },
  ): Promise<TicketSummary> {
    const [created] = await this.db
      .insert(schema.ticket)
      .values({
        subject: input.subject,
        type: input.type,
        priority: input.priority ?? 'moyenne',
        requesterUserId: user.id,
      })
      .returning();
    await this.db
      .insert(schema.ticketMessage)
      .values({ ticketId: created.id, authorUserId: user.id, body: input.description });
    const [summary] = await this.withNames([created]);
    return summary;
  }

  private async loadTicket(user: AuthUser, ticketId: string): Promise<TicketRow> {
    const [row] = await this.db.select().from(schema.ticket).where(eq(schema.ticket.id, ticketId));
    if (!row) throw new NotFoundException('Ticket introuvable');
    if (!this.canTriage(user) && row.requesterUserId !== user.id) {
      throw new ForbiddenException('Accès non autorisé à ce ticket');
    }
    return row;
  }

  async detail(
    user: AuthUser,
    ticketId: string,
  ): Promise<{ canTriage: boolean; ticket: TicketSummary; messages: TicketMessageView[] }> {
    const row = await this.loadTicket(user, ticketId);
    const rows = await this.db
      .select({
        id: schema.ticketMessage.id,
        body: schema.ticketMessage.body,
        createdAt: schema.ticketMessage.createdAt,
        authorName: schema.user.name,
        authorRole: schema.user.role,
      })
      .from(schema.ticketMessage)
      .leftJoin(schema.user, eq(schema.user.id, schema.ticketMessage.authorUserId))
      .where(eq(schema.ticketMessage.ticketId, ticketId))
      .orderBy(schema.ticketMessage.createdAt);

    const messages: TicketMessageView[] = rows.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      authorName: m.authorName,
      authorIsSupport: m.authorRole === 'support' || m.authorRole === 'super_admin',
    }));

    const [ticket] = await this.withNames([row]);
    return { canTriage: this.canTriage(user), ticket, messages };
  }

  async reply(user: AuthUser, ticketId: string, body: string): Promise<TicketMessageView> {
    const row = await this.loadTicket(user, ticketId);

    const [created] = await this.db
      .insert(schema.ticketMessage)
      .values({ ticketId, authorUserId: user.id, body })
      .returning();

    // A support reply moves an open ticket to in_progress and self-assigns it.
    const patch: Partial<TicketRow> = { updatedAt: new Date() };
    if (this.canTriage(user)) {
      if (row.status === 'open') patch.status = 'in_progress';
      if (!row.assigneeUserId) patch.assigneeUserId = user.id;
    }
    await this.db.update(schema.ticket).set(patch).where(eq(schema.ticket.id, ticketId));

    // Notify the other party of the reply.
    const recipientId = this.canTriage(user) ? row.requesterUserId : row.assigneeUserId;
    if (recipientId && recipientId !== user.id) {
      await this.notifications.create({
        userId: recipientId,
        type: 'ticket',
        title: `Réponse au ticket ${this.ref(row.number)}`,
        detail: body.slice(0, 120),
        href: `/app/support/${ticketId}`,
      });
    }

    return {
      id: created.id,
      body: created.body,
      createdAt: created.createdAt,
      authorName: user.name,
      authorIsSupport: this.canTriage(user),
    };
  }

  async update(
    user: AuthUser,
    ticketId: string,
    input: { status?: TicketStatus; assignToMe?: boolean },
  ): Promise<TicketSummary> {
    if (!this.canTriage(user)) throw new ForbiddenException('Réservé au support');
    const [row] = await this.db.select().from(schema.ticket).where(eq(schema.ticket.id, ticketId));
    if (!row) throw new NotFoundException('Ticket introuvable');

    const [updated] = await this.db
      .update(schema.ticket)
      .set({
        ...(input.status ? { status: input.status } : {}),
        ...(input.assignToMe ? { assigneeUserId: user.id } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.ticket.id, ticketId))
      .returning();
    const [summary] = await this.withNames([updated]);
    return summary;
  }
}
