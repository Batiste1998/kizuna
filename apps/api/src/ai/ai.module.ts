import { Global, Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AssistantService } from './assistant.service';

/** Shared OpenAI gateway (referentiel import, assistant, drafting). */
@Global()
@Module({
  controllers: [AiController],
  providers: [AiService, AssistantService],
  exports: [AiService],
})
export class AiModule {}
