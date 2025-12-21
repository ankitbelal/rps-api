import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CreatedUser, PasswordResetUser } from './interfaces/mailing-interface';

const isProd = process.env.NODE_ENV === 'production';
const templatesDir = isProd
  ? join(process.cwd(), 'dist/mailing/templates')
  : join(process.cwd(), 'src/mailing/templates');
const layoutPath = join(templatesDir, 'layouts', 'main.hbs');
const layoutContent = readFileSync(layoutPath, 'utf-8');

@Injectable()
export class MailingService {
  // Hardcoded mock data
  private readonly Company = {
    name: 'RPS@2025.',
    website: 'https://rps.yubrajdhungana.com.np/',
    supportEmail: 'support@rps.com',
    helpCenter: 'https://rps.yubrajdhungana.com.np/help',
    privacyPolicyUrl: 'https://rps.yubrajdhungana.com.np/privacy',
    termsUrl: 'https://rps.yubrajdhungana.com.np/terms',
    unsubscribeUrl: 'https://rps.yubrajdhungana.com.np/unsubscribe',
    address: {
      street: 'Hasanpur-05',
      city: 'Dhangadhi',
      state: 'Sudurparchim',
      zip: '10900',
      country: 'Nepal',
    },
  };
  constructor(private readonly mailingService: MailerService) {
    Handlebars.registerPartial('main', layoutContent);
  }

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
          company: this.Company,
          currentYear: new Date().getFullYear(),
        },
      });
      console.log('Email sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send password reset email using mock data
   * @param userId Optional user ID from mock data (1, 2, or 3)
   */
  async sendPasswordResetEmail(user: PasswordResetUser): Promise<Boolean> {
    try {
      await this.mailingService.sendMail({
        to: user.email,
        subject: 'Reset Your Password - RPS Account',
        template: 'reset-password',
        layout: 'layouts/main',
        context: {
          user: {
            name: user.name,
          },
          subject: 'Reset Your Password - RPS Account',
          otp: user.otp,
          verifyUrl: user.verifyUrl || 'https://rps.yubrajdhungana.com.np',
          company: this.Company,
          currentYear: new Date().getFullYear(),
          expiryMinutes: user.expiryMinutes,
        },
      } as any);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async sendUserCreatedEmail(user: CreatedUser): Promise<Boolean> {
    try {
      await this.mailingService.sendMail({
        to: user.email,
        subject: 'Account Created - RPS Account',
        template: 'user-create',
        layout: 'layouts/main',
        context: {
          user: user,
          subject: 'Account Created - RPS Account',
          loginUrl: user.loginUrl || 'https://rps.yubrajdhungana.com.np',
          company: this.Company,
          currentYear: new Date().getFullYear(),
        },
      } as any);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }
}
