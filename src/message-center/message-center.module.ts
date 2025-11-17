import { Module } from '@nestjs/common';
import { MessageCenterService } from './message-center.service';
import { MessageCenterController } from './message-center.controller';

@Module({
  controllers: [MessageCenterController],
  providers: [MessageCenterService],
})
export class MessageCenterModule {}
