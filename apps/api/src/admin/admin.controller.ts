import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AdminService } from './admin.service';
import {
  CreateEntrepriseDto,
  CreateMemberDto,
  CreatePromotionDto,
  UpsertAssociationDto,
} from './dto/admin.dto';

@UseGuards(AuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.service.overview(user);
  }

  @Get('alternants')
  alternants(@CurrentUser() user: AuthUser) {
    return this.service.listAlternants(user);
  }

  @Get('members')
  members(@CurrentUser() user: AuthUser) {
    return this.service.listMembers(user);
  }

  @Post('members')
  createMember(@CurrentUser() user: AuthUser, @Body() dto: CreateMemberDto) {
    return this.service.createMember(user, dto);
  }

  @Put('alternants/:alternantProfilId/association')
  upsertAssociation(
    @CurrentUser() user: AuthUser,
    @Param('alternantProfilId') alternantProfilId: string,
    @Body() dto: UpsertAssociationDto,
  ) {
    return this.service.upsertAssociation(user, alternantProfilId, dto);
  }

  @Get('entreprises')
  entreprises(@CurrentUser() user: AuthUser) {
    return this.service.listEntreprises(user);
  }

  @Post('entreprises')
  createEntreprise(@CurrentUser() user: AuthUser, @Body() dto: CreateEntrepriseDto) {
    return this.service.createEntreprise(user, dto);
  }

  @Delete('entreprises/:entrepriseId')
  deleteEntreprise(@CurrentUser() user: AuthUser, @Param('entrepriseId') entrepriseId: string) {
    return this.service.deleteEntreprise(user, entrepriseId);
  }

  @Get('promotions')
  promotions(@CurrentUser() user: AuthUser) {
    return this.service.listPromotions(user);
  }

  @Post('promotions')
  createPromotion(@CurrentUser() user: AuthUser, @Body() dto: CreatePromotionDto) {
    return this.service.createPromotion(user, dto);
  }
}
