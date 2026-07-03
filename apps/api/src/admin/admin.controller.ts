import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AdminService } from './admin.service';
import {
  CreateEntrepriseDto,
  CreateMemberDto,
  CreatePromotionDto,
  UpdateEntrepriseDto,
  UpdateMemberDto,
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

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.service.dashboard(user);
  }

  @Get('schools')
  schools(@CurrentUser() user: AuthUser) {
    return this.service.listSchools(user);
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

  @Patch('members/:memberId')
  updateMember(
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.service.updateMember(user, memberId, dto);
  }

  @Delete('members/:memberId')
  removeMember(@CurrentUser() user: AuthUser, @Param('memberId') memberId: string) {
    return this.service.removeMember(user, memberId);
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

  @Patch('entreprises/:entrepriseId')
  updateEntreprise(
    @CurrentUser() user: AuthUser,
    @Param('entrepriseId') entrepriseId: string,
    @Body() dto: UpdateEntrepriseDto,
  ) {
    return this.service.updateEntreprise(user, entrepriseId, dto);
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
