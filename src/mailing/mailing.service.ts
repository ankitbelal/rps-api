import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
@Injectable()
export class MailingService {
  constructor(private readonly mailingService: MailerService) {}

  async sendEmail(email: string, subject: string, message: string) {
    return await this.mailingService.sendMail({
      to: email,
      subject: subject,
      text: message,
    });
  }

  async sendWelcomeEmail(to: string, name: string) {
    await this.mailingService.sendMail({
      to,
      subject: 'Welcome!',
      template: 'welcome', // points to welcome.hbs in this module
      context: { name },
    });
  }
}
