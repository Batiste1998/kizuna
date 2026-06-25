import { Module } from '@nestjs/common';
import { BilansController } from './bilans.controller';
import { BilansService } from './bilans.service';

@Module({
  controllers: [BilansController],
  providers: [BilansService],
})
export class BilansModule {}
