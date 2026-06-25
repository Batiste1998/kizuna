import { Body, Controller, Get, NotFoundException, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { CompetencesService } from './competences.service';
import { SetEvaluationDto } from './dto/set-evaluation.dto';

@UseGuards(AuthGuard)
@Controller()
export class CompetencesController {
  constructor(private readonly service: CompetencesService) {}

  /** Resolve the current user's own apprentice profile (for the alternant space). */
  @Get('me/alternant')
  async myAlternant(@CurrentUser() user: AuthUser) {
    const alternantProfilId = await this.service.getMyAlternantProfileId(user);
    if (!alternantProfilId) throw new NotFoundException('Aucun profil alternant');
    return { alternantProfilId };
  }

  @Get('alternants/:alternantId/competences')
  getCompetences(@CurrentUser() user: AuthUser, @Param('alternantId') alternantId: string) {
    return this.service.getAlternantCompetences(user, alternantId);
  }

  @Put('alternants/:alternantId/competences/:competenceId/evaluation')
  setEvaluation(
    @CurrentUser() user: AuthUser,
    @Param('alternantId') alternantId: string,
    @Param('competenceId') competenceId: string,
    @Body() dto: SetEvaluationDto,
  ) {
    return this.service.setEvaluation(user, alternantId, competenceId, dto.level);
  }
}
