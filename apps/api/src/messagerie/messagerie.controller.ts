import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { MessagerieService } from './messagerie.service';
import { SendMessageDto } from './dto/message.dto';

@UseGuards(AuthGuard)
@Controller()
export class MessagerieController {
  constructor(private readonly service: MessagerieService) {}

  @Get('alternants/:alternantId/messages')
  list(@CurrentUser() user: AuthUser, @Param('alternantId') alternantId: string) {
    return this.service.list(user, alternantId);
  }

  @Post('alternants/:alternantId/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('alternantId') alternantId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.send(user, alternantId, dto.body);
  }
}
