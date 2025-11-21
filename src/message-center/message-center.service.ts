import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
@Injectable()
export class MessageCenterService {
  constructor(private readonly mailService: MailerService) {}

  async sendEmail(
    email: string,
    subject: string,
    templateName: string, // name of your HBS file, e.g., 'otp-email'
    context: Record<string, any>, // dynamic values for template
  ) {
    return await this.mailService.sendMail({
      to: email,
      subject: subject,
      template: templateName, // points to templates/<templateName>.hbs
      context: context, // values used in the template {{placeholder}}
    });
  }

  async sendOTP(
    email: string,
    name: string,
    otp: string,
    action: string = 'reset your password',
    expiryMinutes: number = 5,
  ) {
    const currentYear = new Date().getFullYear();
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    return this.sendEmail(email, 'OTP Verification', 'otp-email', {
      name,
      otp,
      action,
      expiryMinutes,
      year: currentYear,
      logoUrl: `${appUrl}/images/logos/RPSlogo.png`,
      footerLogoUrl: `${appUrl}/images/logos/RPSlogo.png`,
    });
  }
}
