import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { schema } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import { AccessService } from '../access/access.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../auth/auth.types';

type Echeance = typeof schema.echeance.$inferSelect;

export interface EcheancierView {
  alternantProfilId: string;
  promotionId: string | null;
  canManage: boolean;
  echeances: Echeance[];
}

@Injectable()
export class EcheancierService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: AccessService,
    private readonly notifications: NotificationsService,
  ) {}

  private get db() {
    return this.database.db;
  }

  /** Deadlines of the apprentice's promotion (shared by the whole cohort). */
  async list(user: AuthUser, alternantProfilId: string): Promise<EcheancierView> {
    const { profil, canManage } = await this.access.resolveAlternantAccess(user, alternantProfilId);
    if (!profil.promotionId) {
      return { alternantProfilId, promotionId: null, canManage, echeances: [] };
    }
    const echeances = await this.db
      .select()
      .from(schema.echeance)
      .where(eq(schema.echeance.promotionId, profil.promotionId))
      .orderBy(schema.echeance.dueDate);
    return { alternantProfilId, promotionId: profil.promotionId, canManage, echeances };
  }

  async create(
    user: AuthUser,
    alternantProfilId: string,
    input: { title: string; dueDate: string; description?: string },
  ): Promise<Echeance> {
    const { profil, canManage } = await this.access.resolveAlternantAccess(user, alternantProfilId);
    if (!canManage) throw new ForbiddenException('Seuls les tuteurs / admin créent une échéance');
    if (!profil.promotionId) {
      throw new BadRequestException('Cet alternant n’est rattaché à aucune promotion');
    }

    const [created] = await this.db
      .insert(schema.echeance)
      .values({
        promotionId: profil.promotionId,
        title: input.title,
        dueDate: new Date(input.dueDate),
        description: input.description ?? null,
        createdByUserId: user.id,
      })
      .returning();

    if (profil.userId !== user.id) {
      await this.notifications.create({
        userId: profil.userId,
        type: 'echeance',
        title: 'Nouvelle échéance',
        detail: input.title,
        href: '/app/echeancier',
      });
    }
    return created;
  }
}
