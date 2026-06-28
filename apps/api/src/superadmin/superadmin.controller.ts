import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { SuperAdminService } from './superadmin.service';
import {
  CreateEstablishmentTypeDto,
  CreateOrganizationDto,
  CreateUserDto,
  UpdateOrganizationDto,
  UpdateUserDto,
} from './dto/superadmin.dto';

@UseGuards(AuthGuard)
@Controller('superadmin')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.service.overview(user);
  }

  @Get('organizations')
  organizations(@CurrentUser() user: AuthUser) {
    return this.service.listOrganizations(user);
  }

  @Post('organizations')
  createOrganization(@CurrentUser() user: AuthUser, @Body() dto: CreateOrganizationDto) {
    return this.service.createOrganization(user, dto);
  }

  @Patch('organizations/:orgId')
  updateOrganization(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.service.updateOrganization(user, orgId, dto);
  }

  @Delete('organizations/:orgId')
  deleteOrganization(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string) {
    return this.service.deleteOrganization(user, orgId);
  }

  @Get('users')
  users(@CurrentUser() user: AuthUser) {
    return this.service.listUsers(user);
  }

  @Post('users')
  createUser(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.service.createUser(user, dto);
  }

  @Patch('users/:userId')
  updateUser(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.updateUser(user, userId, dto);
  }

  @Delete('users/:userId')
  deleteUser(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.service.deleteUser(user, userId);
  }

  @Get('establishment-types')
  establishmentTypes(@CurrentUser() user: AuthUser) {
    return this.service.listEstablishmentTypes(user);
  }

  @Post('establishment-types')
  createEstablishmentType(@CurrentUser() user: AuthUser, @Body() dto: CreateEstablishmentTypeDto) {
    return this.service.createEstablishmentType(user, dto.label);
  }

  @Delete('establishment-types/:typeId')
  deleteEstablishmentType(@CurrentUser() user: AuthUser, @Param('typeId') typeId: string) {
    return this.service.deleteEstablishmentType(user, typeId);
  }
}
