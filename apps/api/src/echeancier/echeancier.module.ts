import { Module } from '@nestjs/common';
import { EcheancierController } from './echeancier.controller';
import { EcheancierService } from './echeancier.service';
import { EcheanceReminderService } from './echeance-reminder.service';

@Module({
  controllers: [EcheancierController],
  providers: [EcheancierService, EcheanceReminderService],
})
export class EcheancierModule {}
