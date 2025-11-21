import { Module } from '@nestjs/common';
import { MessageCenterService } from './message-center.service';
import { MessageCenterController } from './message-center.controller';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

const DEFAULT_MAIL_PORT = 587;
const isProd = process.env.NODE_ENV === 'production';

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
        emplate: {
          dir: join(
            __dirname,
            isProd ? 'message-center/templates' : '..',
            'message-center',
            'templates',
          ),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
  controllers: [MessageCenterController],
  providers: [MessageCenterService],
  exports: [MessageCenterService],
})
export class MessageCenterModule {}
