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
  @Post('welcome')
  async sendWelcomeEmail() {
    return await this.mailingService.sendWelcomeEmail(
      'aankitbelal@gmail.com',
      'ankit',
    );

    // await this.mailingService.sendStudentsResultEmail({
    //   student: {
    //     name: 'Ankit Belal',
    //     rollNumber: '045',
    //     registrationNumber: 'REG-2021-BCA-045',
    //     email: 'aankitbelal@gmail.com',
    //   },
    //   result: {
    //     examName: 'Mid-Term Examination 2024',
    //     semester: 'Second Semester',
    //   },
    // });
  }
}
