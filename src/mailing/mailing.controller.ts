import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
} from '@nestjs/common';
import { MailingService } from './mailing.service';
@Controller('mail')
export class MailingController {
  constructor(private readonly mailingService: MailingService) {}

  @HttpCode(200)
  @Post()
  @Post('welcome')
  async sendWelcomeEmail() {
    return await this.mailingService.sendWelcomeEmail(
      'aankitbelal@gmail.com',
      'ankit',
    );
  }
}
