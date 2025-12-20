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

  async sendWelcomeEmail(email: string, name: string) {
    try {
      await this.mailingService.sendMail({
        to: email,
        subject: 'Welcome to Our Service',
        template: 'welcome', 
        context: {
          name: name,
          year: new Date().getFullYear(),
        },
      });
      console.log('Email sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}
