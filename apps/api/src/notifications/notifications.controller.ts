import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';

@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.service.markAllRead(user);
  }

  @Post(':notificationId/read')
  markRead(@CurrentUser() user: AuthUser, @Param('notificationId') notificationId: string) {
    return this.service.markRead(user, notificationId);
  }
}
