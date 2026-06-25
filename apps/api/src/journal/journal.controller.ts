import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { JournalService } from './journal.service';
import { CreateJournalEntryDto, ReviewJournalEntryDto } from './dto/journal.dto';

@UseGuards(AuthGuard)
@Controller()
export class JournalController {
  constructor(private readonly service: JournalService) {}

  @Get('alternants/:alternantId/journal')
  list(@CurrentUser() user: AuthUser, @Param('alternantId') alternantId: string) {
    return this.service.list(user, alternantId);
  }

  @Post('alternants/:alternantId/journal')
  create(
    @CurrentUser() user: AuthUser,
    @Param('alternantId') alternantId: string,
    @Body() dto: CreateJournalEntryDto,
  ) {
    return this.service.create(user, alternantId, dto);
  }

  @Put('journal/:entryId/review')
  review(
    @CurrentUser() user: AuthUser,
    @Param('entryId') entryId: string,
    @Body() dto: ReviewJournalEntryDto,
  ) {
    return this.service.review(user, entryId, dto);
  }
}
