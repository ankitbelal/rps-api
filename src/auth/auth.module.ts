import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from 'src/user/user.module';
import { MailingModule } from 'src/mailing/mailing.module';

const ACCESS_TOKEN_EXPIRES_IN = '15m';  //done this because typescript return error while getting from env
@Module({
  imports: [
    UserModule,
    MailingModule,
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret =
          config.get<string>('ACCESS_TOKEN_SECRET') || 'defaultAccessSecret';
        return {
          secret,
          signOptions: {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
