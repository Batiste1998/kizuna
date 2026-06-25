import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { DOCUMENT_CATEGORIES, schema, type DocumentCategory } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import { AccessService } from '../access/access.service';
import type { AuthUser } from '../auth/auth.types';

type Document = typeof schema.document.$inferSelect;

export interface DocumentsView {
  alternantProfilId: string;
  canUpload: boolean;
  documents: Document[];
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: AccessService,
    private readonly config: ConfigService,
  ) {}

  private get db() {
    return this.database.db;
  }

  uploadDir(): string {
    return resolve(process.cwd(), this.config.getOrThrow<string>('UPLOAD_DIR'));
  }

  async list(user: AuthUser, alternantProfilId: string): Promise<DocumentsView> {
    const access = await this.access.resolveAlternantAccess(user, alternantProfilId);
    const documents = await this.db
      .select()
      .from(schema.document)
      .where(eq(schema.document.alternantProfilId, alternantProfilId))
      .orderBy(schema.document.createdAt);
    return { alternantProfilId, canUpload: access.relation !== 'platform', documents };
  }

  async record(
    user: AuthUser,
    alternantProfilId: string,
    file: Express.Multer.File,
    category: string | undefined,
  ): Promise<Document> {
    const access = await this.access.resolveAlternantAccess(user, alternantProfilId);
    if (access.relation === 'platform') {
      await this.safeUnlink(file.filename);
      throw new ForbiddenException('Vous n’êtes pas autorisé à déposer un document');
    }

    const cat: DocumentCategory = DOCUMENT_CATEGORIES.includes(category as DocumentCategory)
      ? (category as DocumentCategory)
      : 'autre';

    const [created] = await this.db
      .insert(schema.document)
      .values({
        alternantProfilId,
        uploadedByUserId: user.id,
        category: cat,
        originalName: file.originalname,
        storageKey: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      })
      .returning();
    return created;
  }

  async getForDownload(
    user: AuthUser,
    documentId: string,
  ): Promise<{ document: Document; path: string }> {
    const [document] = await this.db
      .select()
      .from(schema.document)
      .where(eq(schema.document.id, documentId));
    if (!document) throw new NotFoundException('Document introuvable');

    await this.access.resolveAlternantAccess(user, document.alternantProfilId);
    const path = join(this.uploadDir(), document.storageKey);
    if (!existsSync(path)) throw new NotFoundException('Fichier manquant sur le serveur');
    return { document, path };
  }

  async remove(user: AuthUser, documentId: string): Promise<{ id: string }> {
    const [document] = await this.db
      .select()
      .from(schema.document)
      .where(eq(schema.document.id, documentId));
    if (!document) throw new NotFoundException('Document introuvable');

    const access = await this.access.resolveAlternantAccess(user, document.alternantProfilId);
    const isUploader = document.uploadedByUserId === user.id;
    if (!isUploader && !access.canManage) {
      throw new ForbiddenException('Suppression réservée à l’auteur ou à un tuteur / admin');
    }

    await this.safeUnlink(document.storageKey);
    await this.db.delete(schema.document).where(eq(schema.document.id, documentId));
    return { id: documentId };
  }

  private async safeUnlink(storageKey: string): Promise<void> {
    const path = join(this.uploadDir(), storageKey);
    if (existsSync(path)) await unlink(path).catch(() => undefined);
  }
}
