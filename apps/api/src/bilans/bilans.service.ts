import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { schema, type BilanStatus } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import { AccessService } from '../access/access.service';
import type { AuthUser } from '../auth/auth.types';

type Bilan = typeof schema.bilan.$inferSelect;

export interface BilansView {
  alternantProfilId: string;
  canManage: boolean;
  bilans: Bilan[];
}

@Injectable()
export class BilansService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: AccessService,
  ) {}

  private get db() {
    return this.database.db;
  }

  async list(user: AuthUser, alternantProfilId: string): Promise<BilansView> {
    const { canManage } = await this.access.resolveAlternantAccess(user, alternantProfilId);
    const bilans = await this.db
      .select()
      .from(schema.bilan)
      .where(eq(schema.bilan.alternantProfilId, alternantProfilId))
      .orderBy(schema.bilan.scheduledAt);
    return { alternantProfilId, canManage, bilans };
  }

  async create(
    user: AuthUser,
    alternantProfilId: string,
    input: { label: string; scheduledAt: string },
  ): Promise<Bilan> {
    const { canManage } = await this.access.resolveAlternantAccess(user, alternantProfilId);
    if (!canManage)
      throw new ForbiddenException('Seuls les tuteurs ou l’admin planifient un bilan');

    const [created] = await this.db
      .insert(schema.bilan)
      .values({
        alternantProfilId,
        label: input.label,
        scheduledAt: new Date(input.scheduledAt),
        createdByUserId: user.id,
      })
      .returning();
    return created;
  }

  async update(
    user: AuthUser,
    bilanId: string,
    input: { status?: BilanStatus; label?: string; scheduledAt?: string; summary?: string },
  ): Promise<Bilan> {
    const [existing] = await this.db
      .select()
      .from(schema.bilan)
      .where(eq(schema.bilan.id, bilanId));
    if (!existing) throw new NotFoundException('Bilan introuvable');

    const { canManage } = await this.access.resolveAlternantAccess(
      user,
      existing.alternantProfilId,
    );
    if (!canManage) throw new ForbiddenException('Modification réservée aux tuteurs / admin');

    const [updated] = await this.db
      .update(schema.bilan)
      .set({
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.scheduledAt !== undefined ? { scheduledAt: new Date(input.scheduledAt) } : {}),
        ...(input.summary !== undefined ? { summary: input.summary } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.bilan.id, bilanId))
      .returning();
    return updated;
  }
}
