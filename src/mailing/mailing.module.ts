import { Module } from '@nestjs/common';
import { MessageCenterService } from './mailing.service';
import { MessageCenterController } from './mailing.controller';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService, ConfigModule } from '@nestjs/config';

const DEFAULT_MAIL_PORT = 587;

@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST'),
          port: config.get<number>('MAIL_PORT') || DEFAULT_MAIL_PORT,
          secure: false,
          auth: {
            user: config.get<string>('MAIL_USERNAME'),
            pass: config.get<string>('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: config.get<string>('MAIL_FROM'),
        },
      }),
    }),
  ],
  controllers: [MessageCenterController],
  providers: [MessageCenterService],
  exports: [MessageCenterService],
})
export class MessageCenterModule {}
