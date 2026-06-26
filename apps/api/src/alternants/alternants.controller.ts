import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AlternantsService } from './alternants.service';

@UseGuards(AuthGuard)
@Controller()
export class AlternantsController {
  constructor(private readonly service: AlternantsService) {}

  /** Apprentices supervised by the current user (tutor view). */
  @Get('me/alternants')
  listForTutor(@CurrentUser() user: AuthUser) {
    return this.service.listForTutor(user);
  }

  /** Tutor dashboard aggregate (supervised apprentices + upcoming bilans). */
  @Get('me/tutor-dashboard')
  tutorDashboard(@CurrentUser() user: AuthUser) {
    return this.service.tutorDashboard(user);
  }

  /** Apprentice self dashboard (progress, trinôme, next bilan). */
  @Get('me/alternant-dashboard')
  alternantDashboard(@CurrentUser() user: AuthUser) {
    return this.service.alternantDashboard(user);
  }
}
