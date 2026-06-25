import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { SuperAdminService } from './superadmin.service';
import { CreateOrganizationDto, UpdateUserDto } from './dto/superadmin.dto';

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

  @Get('users')
  users(@CurrentUser() user: AuthUser) {
    return this.service.listUsers(user);
  }

  @Patch('users/:userId')
  updateUser(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.updateUser(user, userId, dto);
  }
}
