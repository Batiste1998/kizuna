import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { BilansService } from './bilans.service';
import { CreateBilanDto, UpdateBilanDto } from './dto/bilan.dto';

@UseGuards(AuthGuard)
@Controller()
export class BilansController {
  constructor(private readonly service: BilansService) {}

  @Get('alternants/:alternantId/bilans')
  list(@CurrentUser() user: AuthUser, @Param('alternantId') alternantId: string) {
    return this.service.list(user, alternantId);
  }

  @Post('alternants/:alternantId/bilans')
  create(
    @CurrentUser() user: AuthUser,
    @Param('alternantId') alternantId: string,
    @Body() dto: CreateBilanDto,
  ) {
    return this.service.create(user, alternantId, dto);
  }

  @Patch('bilans/:bilanId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('bilanId') bilanId: string,
    @Body() dto: UpdateBilanDto,
  ) {
    return this.service.update(user, bilanId, dto);
  }
}
