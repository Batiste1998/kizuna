import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { schema, type EvaluatorRole, type JournalStatus } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import { AccessService } from '../access/access.service';
import type { AuthUser } from '../auth/auth.types';

export interface JournalEntryView {
  id: string;
  title: string;
  content: string;
  status: JournalStatus;
  reviewComment: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  authorName: string | null;
}

export interface JournalView {
  alternantProfilId: string;
  /** Evaluator role of the current user (entreprise can validate, auto can write). */
  editableAs: EvaluatorRole | null;
  entries: JournalEntryView[];
}

@Injectable()
export class JournalService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: AccessService,
  ) {}

  private get db() {
    return this.database.db;
  }

  async list(user: AuthUser, alternantProfilId: string): Promise<JournalView> {
    const { editableAs } = await this.access.resolveAlternantAccess(user, alternantProfilId);

    const entries = await this.db
      .select({
        id: schema.journalEntry.id,
        title: schema.journalEntry.title,
        content: schema.journalEntry.content,
        status: schema.journalEntry.status,
        reviewComment: schema.journalEntry.reviewComment,
        reviewedAt: schema.journalEntry.reviewedAt,
        createdAt: schema.journalEntry.createdAt,
        authorName: schema.user.name,
      })
      .from(schema.journalEntry)
      .leftJoin(schema.user, eq(schema.user.id, schema.journalEntry.authorUserId))
      .where(eq(schema.journalEntry.alternantProfilId, alternantProfilId))
      .orderBy(desc(schema.journalEntry.createdAt));

    return { alternantProfilId, editableAs, entries };
  }

  async create(
    user: AuthUser,
    alternantProfilId: string,
    input: { title: string; content: string },
  ): Promise<JournalEntryView> {
    const { editableAs } = await this.access.resolveAlternantAccess(user, alternantProfilId);
    if (editableAs !== 'auto') {
      throw new ForbiddenException('Seul l’alternant peut rédiger son journal');
    }

    const [entry] = await this.db
      .insert(schema.journalEntry)
      .values({
        alternantProfilId,
        authorUserId: user.id,
        title: input.title,
        content: input.content,
      })
      .returning();

    return { ...entry, authorName: user.name };
  }

  async review(
    user: AuthUser,
    entryId: string,
    input: { status: 'validated' | 'changes_requested'; comment?: string },
  ): Promise<{ id: string; status: JournalStatus }> {
    const [entry] = await this.db
      .select()
      .from(schema.journalEntry)
      .where(eq(schema.journalEntry.id, entryId));
    if (!entry) throw new NotFoundException('Entrée de journal introuvable');

    const { editableAs } = await this.access.resolveAlternantAccess(user, entry.alternantProfilId);
    if (editableAs !== 'entreprise') {
      throw new ForbiddenException('Seul le tuteur d’entreprise peut valider le journal');
    }

    await this.db
      .update(schema.journalEntry)
      .set({
        status: input.status,
        reviewComment: input.comment ?? null,
        reviewerUserId: user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.journalEntry.id, entryId));

    return { id: entryId, status: input.status };
  }
}
