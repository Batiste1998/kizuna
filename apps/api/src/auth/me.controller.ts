import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { CurrentUser } from './current-user.decorator';
import type { AuthUser } from './auth.types';

@Controller()
export class MeController {
  /** Current authenticated user — any role. */
  @UseGuards(AuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { id: user.id, email: user.email, name: user.name, role: user.role ?? 'user' };
  }

  /** Platform-only route — demonstrates RBAC (super_admin). */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('admin/overview')
  adminOverview() {
    return { ok: true, scope: 'platform' };
  }
}
