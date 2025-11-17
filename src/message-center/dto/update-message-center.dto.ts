import { PartialType } from '@nestjs/mapped-types';
import { CreateMessageCenterDto } from './create-message-center.dto';

export class UpdateMessageCenterDto extends PartialType(CreateMessageCenterDto) {}
