import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AiService } from './ai.service';

@UseGuards(AuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** Lets the web app show or hide AI affordances. */
  @Get('status')
  status() {
    return { configured: this.ai.isConfigured };
  }
}
