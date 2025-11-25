import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { MessageCenterService } from './mailing.service';
import { Public } from 'src/auth/jwt/public.decorator';
@Controller('message-center')
export class MessageCenterController {
  constructor(private readonly messageCenterService: MessageCenterService) {}
  
  // @Public()
  // @HttpCode(200)
  // @Post()
  // async sendEmail(){
  //   return await this.messageCenterService.sendEmail();
  // }

}
