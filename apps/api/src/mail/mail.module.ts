import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/** Shared transactional email sender (SMTP or dev console fallback). */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
