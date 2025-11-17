import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MessageCenterService } from './message-center.service';
@Controller('message-center')
export class MessageCenterController {
  constructor(private readonly messageCenterService: MessageCenterService) {}

}
