import { Module } from '@nestjs/common';
import { EcheancierController } from './echeancier.controller';
import { EcheancierService } from './echeancier.service';

@Module({
  controllers: [EcheancierController],
  providers: [EcheancierService],
})
export class EcheancierModule {}
