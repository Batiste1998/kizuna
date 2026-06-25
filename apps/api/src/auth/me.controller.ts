import { Controller, Get, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { schema } from '@kizuna/db';
import type { MeResponse } from '@kizuna/shared';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { CurrentUser } from './current-user.decorator';
import type { AuthUser } from './auth.types';
import { DatabaseService } from '../database/database.service';

@Controller()
export class MeController {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Current authenticated user — any role. Includes the establishment roles
   * (member roles) and whether the user owns an apprentice profile, so the
   * front-end can build a role-aware navigation without extra round-trips.
   */
  @UseGuards(AuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    const memberships = await this.database.db
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(eq(schema.member.userId, user.id));

    const [alternant] = await this.database.db
      .select({ id: schema.alternantProfil.id })
      .from(schema.alternantProfil)
      .where(eq(schema.alternantProfil.userId, user.id));

    const memberRoles = [...new Set(memberships.map((m) => m.role))];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role ?? 'user',
      memberRoles,
      isAlternant: Boolean(alternant),
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
    };
  }

  /** Platform-only route — demonstrates RBAC (super_admin). */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('admin/overview')
  adminOverview() {
    return { ok: true, scope: 'platform' };
  }
}
