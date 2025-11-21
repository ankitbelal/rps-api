import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
@Injectable()
export class MessageCenterService {
  constructor(private readonly mailService: MailerService) {}

  async sendEmail(email: string, subject: string, message: string) {
    return await this.mailService.sendMail({
      to: email,
      subject: subject,
      text: message,
    });
  }
}
