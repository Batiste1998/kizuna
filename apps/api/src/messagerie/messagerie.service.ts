import { ForbiddenException, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { schema } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import { AccessService, type AlternantAccess } from '../access/access.service';
import type { AuthUser } from '../auth/auth.types';

export type AuthorRelation = 'alternant' | 'peda' | 'entreprise' | 'other';

export interface MessageView {
  id: string;
  body: string;
  createdAt: Date;
  authorUserId: string;
  authorName: string | null;
  authorRelation: AuthorRelation;
}

export interface MessagerieView {
  alternantProfilId: string;
  canPost: boolean;
  messages: MessageView[];
}

@Injectable()
export class MessagerieService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: AccessService,
  ) {}

  private get db() {
    return this.database.db;
  }

  private relationOf(access: AlternantAccess, authorUserId: string): AuthorRelation {
    if (authorUserId === access.profil.userId) return 'alternant';
    if (authorUserId === access.association?.tuteurPedaUserId) return 'peda';
    if (authorUserId === access.association?.tuteurEntrepriseUserId) return 'entreprise';
    return 'other';
  }

  async list(user: AuthUser, alternantProfilId: string): Promise<MessagerieView> {
    const access = await this.access.resolveAlternantAccess(user, alternantProfilId);

    const rows = await this.db
      .select({
        id: schema.message.id,
        body: schema.message.body,
        createdAt: schema.message.createdAt,
        authorUserId: schema.message.authorUserId,
        authorName: schema.user.name,
      })
      .from(schema.message)
      .leftJoin(schema.user, eq(schema.user.id, schema.message.authorUserId))
      .where(eq(schema.message.alternantProfilId, alternantProfilId))
      .orderBy(schema.message.createdAt);

    const messages: MessageView[] = rows.map((r) => ({
      ...r,
      authorRelation: this.relationOf(access, r.authorUserId),
    }));

    // Only trinôme members (editableAs set) may post.
    return { alternantProfilId, canPost: access.editableAs !== null, messages };
  }

  async send(user: AuthUser, alternantProfilId: string, body: string): Promise<MessageView> {
    const access = await this.access.resolveAlternantAccess(user, alternantProfilId);
    if (access.editableAs === null) {
      throw new ForbiddenException('Seul le trinôme peut écrire dans cette messagerie');
    }

    const [created] = await this.db
      .insert(schema.message)
      .values({ alternantProfilId, authorUserId: user.id, body })
      .returning();

    return {
      id: created.id,
      body: created.body,
      createdAt: created.createdAt,
      authorUserId: user.id,
      authorName: user.name,
      authorRelation: this.relationOf(access, user.id),
    };
  }
}
