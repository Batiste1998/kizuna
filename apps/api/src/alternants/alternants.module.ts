import { Module } from '@nestjs/common';
import { AlternantsController } from './alternants.controller';
import { AlternantsService } from './alternants.service';

@Module({
  controllers: [AlternantsController],
  providers: [AlternantsService],
})
export class AlternantsModule {}
