import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AiService } from './ai.service';
import { AssistantService } from './assistant.service';
import { ChatDto } from './dto/chat.dto';

@UseGuards(AuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly assistant: AssistantService,
  ) {}

  /** Lets the web app show or hide AI affordances. */
  @Get('status')
  status() {
    return { configured: this.ai.isConfigured };
  }

  /** Help assistant — streams the reply as plain text. */
  @Post('chat')
  chat(@CurrentUser() user: AuthUser, @Body() dto: ChatDto, @Res() res: Response) {
    return this.assistant.stream(user, dto.messages, res);
  }
}
