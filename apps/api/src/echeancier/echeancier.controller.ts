import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { EcheancierService } from './echeancier.service';
import { CreateEcheanceDto } from './dto/echeance.dto';

@UseGuards(AuthGuard)
@Controller()
export class EcheancierController {
  constructor(private readonly service: EcheancierService) {}

  @Get('alternants/:alternantId/echeances')
  list(@CurrentUser() user: AuthUser, @Param('alternantId') alternantId: string) {
    return this.service.list(user, alternantId);
  }

  @Post('alternants/:alternantId/echeances')
  create(
    @CurrentUser() user: AuthUser,
    @Param('alternantId') alternantId: string,
    @Body() dto: CreateEcheanceDto,
  ) {
    return this.service.create(user, alternantId, dto);
  }
}
