import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { SupportService } from './support.service';
import { CreateTicketDto, ReplyTicketDto, UpdateTicketDto } from './dto/ticket.dto';

@UseGuards(AuthGuard)
@Controller('tickets')
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.service.create(user, dto);
  }

  @Get(':ticketId')
  detail(@CurrentUser() user: AuthUser, @Param('ticketId') ticketId: string) {
    return this.service.detail(user, ticketId);
  }

  @Post(':ticketId/messages')
  reply(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return this.service.reply(user, ticketId, dto.body);
  }

  @Patch(':ticketId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.service.update(user, ticketId, dto);
  }
}
