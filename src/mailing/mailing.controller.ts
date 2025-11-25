import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { MailingService } from './mailing.service';
import { Public } from 'src/auth/jwt/public.decorator';
@Controller('message-center')
export class MailingController {
  constructor(private readonly messageCenterService: MailingService) {}
  
  // @Public()
  // @HttpCode(200)
  // @Post()
  // async sendEmail(){
  //   return await this.messageCenterService.sendEmail();
  // }

}
